--[[
	OnBlox System - Dances (SERVER)                       system.onbloxstudio.com
	Taruh di: ServerScriptService > OnBlox > OnBloxDances (Script)
	Butuh:    ServerScriptService > OnBlox > Config (ModuleScript), salin dari dashboard:
	            return { Url = "...", Key = "obx_...", RefreshSeconds = 300 }
	Syarat:   Game Settings > Security > "Allow HTTP Requests" = ON

	Kapan daftar diambil (hemat, tidak polling terus-terusan):
	  1. Sekali saat server mulai.
	  2. INSTAN saat website mengirim sinyal lewat MessagingService (topik "OnBloxSystem").
	  3. Cadangan: cek ringan tiap RefreshSeconds (default 5 menit, minimal 60 detik).
	     Kalau tidak ada perubahan, website hanya membalas { changed = false } (beberapa byte).

	Hasil:
	  * ReplicatedStorage > OnBlox > Dances (StringValue berisi JSON) + atribut "Version".
	  * Sistem dance (mis. GraypoleaDance) mendengarkan Dances:GetAttributeChangedSignal("Version").
	  * Kunci API hanya ada di ServerScriptService (tidak pernah terlihat oleh client).
]]

local HttpService = game:GetService("HttpService")
local MessagingService = game:GetService("MessagingService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(script.Parent:WaitForChild("Config"))
local REFRESH = math.max(60, tonumber(Config.RefreshSeconds) or 300)
local TOPIC = "OnBloxSystem"
local SLUG = tostring(Config.Url or ""):match("/maps/([^/]+)/") or ""

if type(Config.Key) ~= "string" or not Config.Key:match("^obx_") then
	warn("[OnBlox] Config.Key belum diisi. Salin kunci API dari dashboard (system.onbloxstudio.com) ke OnBlox > Config.")
	return
end

local folder = ReplicatedStorage:FindFirstChild("OnBlox") or Instance.new("Folder")
folder.Name = "OnBlox"
folder.Parent = ReplicatedStorage

local store = folder:FindFirstChild("Dances") or Instance.new("StringValue")
store.Name = "Dances"
store.Value = store.Value ~= "" and store.Value or "[]"
store.Parent = folder

local version = nil
local busy = false

local function fetch(reason)
	if busy then
		return
	end
	busy = true
	local url = Config.Url .. (version and ("?since=" .. version) or "")
	local ok, res = pcall(function()
		return HttpService:RequestAsync({
			Url = url,
			Method = "GET",
			Headers = { ["x-onblox-key"] = Config.Key },
		})
	end)
	busy = false
	if not ok then
		warn("[OnBlox] Gagal menghubungi website:", res)
		return
	end
	if not res.Success then
		warn("[OnBlox] Website menolak (" .. tostring(res.StatusCode) .. "): " .. tostring(res.Body):sub(1, 200))
		return
	end
	local okJson, data = pcall(HttpService.JSONDecode, HttpService, res.Body)
	if not okJson or type(data) ~= "table" then
		warn("[OnBlox] Balasan website tidak valid")
		return
	end
	if data.changed == false then
		return
	end

	-- bersihkan & validasi setiap entri
	local list = {}
	for _, d in ipairs(data.dances or {}) do
		local id = tostring(d.animationId or ""):match("(%d+)$")
		if id and type(d.name) == "string" and d.name ~= "" then
			table.insert(list, {
				name = d.name:sub(1, 60),
				animationId = "rbxassetid://" .. id,
				category = (d.category == "Pose") and "Pose" or "Dance",
			})
		end
	end
	store.Value = HttpService:JSONEncode(list)
	version = tostring(data.version)
	store:SetAttribute("Version", version)
	print(("[OnBlox] %d dance dari website dimuat (versi %s, %s)"):format(#list, version, reason))
end

-- 2. Sinyal instan dari website. Isi pesan: slug map, atau "*" untuk semua map.
task.spawn(function()
	local ok, err = pcall(function()
		MessagingService:SubscribeAsync(TOPIC, function(message)
			local target = tostring(message.Data or "")
			if target == "*" or target == SLUG then
				task.wait(math.random() * 3) -- jangan semua server menembak bersamaan
				fetch("sinyal website")
			end
		end)
	end)
	if not ok then
		warn("[OnBlox] MessagingService tidak aktif, hanya memakai cek berkala:", err)
	end
end)

-- 1 + 3. Saat server mulai, lalu cek cadangan berkala.
task.spawn(function()
	fetch("server mulai")
	while true do
		task.wait(REFRESH)
		fetch("cek berkala")
	end
end)
