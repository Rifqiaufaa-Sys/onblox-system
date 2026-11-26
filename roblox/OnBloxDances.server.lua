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

	ID emote dari marketplace (mis. roblox.com/catalog/87891628617367) BUKAN ID animasi: isinya objek
	Animation dengan ID lain. Script ini membongkarnya otomatis (InsertService:LoadAsset) dan memakai ID
	animasi aslinya, jadi TIDAK perlu spoof / upload ulang. Hasil bongkar disimpan per server.

	Hasil:
	  * ReplicatedStorage > OnBlox > Dances (StringValue berisi JSON) + atribut "Version".
	  * Sistem dance (mis. GraypoleaDance) mendengarkan Dances:GetAttributeChangedSignal("Version").
	  * Kunci API hanya ada di ServerScriptService (tidak pernah terlihat oleh client).
]]

local HttpService = game:GetService("HttpService")
local InsertService = game:GetService("InsertService")
local MarketplaceService = game:GetService("MarketplaceService")
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

-- id (angka, string) -> "rbxassetid://<animasi asli>" | false (bukan emote, pakai apa adanya)
local resolved = {}

-- Ubah ID dari website jadi ID yang bisa diputar. kind: "emote" | "animation" | nil (belum tahu).
-- Balas (animationId, gagal?)
local function playableId(id, kind)
	local plain = "rbxassetid://" .. id
	if kind == "animation" then
		return plain, false
	end
	local cached = resolved[id]
	if cached ~= nil then
		return cached or plain, false
	end
	if kind ~= "emote" then
		local ok, info = pcall(MarketplaceService.GetProductInfo, MarketplaceService, tonumber(id))
		if not ok then
			return plain, true -- coba lagi nanti
		end
		if not (info and info.AssetTypeId == 61) then
			resolved[id] = false
			return plain, false
		end
	end
	local ok, model = pcall(InsertService.LoadAsset, InsertService, tonumber(id))
	local anim = ok and model and model:FindFirstChildWhichIsA("Animation", true)
	local real = anim and tostring(anim.AnimationId):match("(%d+)$")
	if ok and model then
		model:Destroy()
	end
	if not real then
		warn("[OnBlox] Gagal membongkar emote " .. id .. ":", ok and "tidak ada Animation di dalamnya" or model)
		return plain, true
	end
	resolved[id] = "rbxassetid://" .. real
	return resolved[id], false
end

local function fetchNow(reason)
	local url = Config.Url .. (version and ("?since=" .. version) or "")
	local ok, res = pcall(function()
		return HttpService:RequestAsync({
			Url = url,
			Method = "GET",
			Headers = { ["x-onblox-key"] = Config.Key },
		})
	end)
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

	-- bersihkan & validasi setiap entri; ID emote marketplace diganti ID animasi aslinya
	local list, failed, converted = {}, 0, 0
	for _, d in ipairs(data.dances or {}) do
		local id = tostring(d.animationId or ""):match("(%d+)$")
		if id and type(d.name) == "string" and d.name ~= "" then
			local animationId, didFail = playableId(id, d.type)
			if didFail then
				failed += 1
			elseif animationId ~= "rbxassetid://" .. id then
				converted += 1
			end
			table.insert(list, {
				name = d.name:sub(1, 60),
				animationId = animationId,
				category = (d.category == "Pose") and "Pose" or "Dance",
			})
		end
	end
	store.Value = HttpService:JSONEncode(list)
	-- ada yang gagal dibongkar: jangan simpan versi, supaya cek berikutnya mencoba lagi
	version = failed == 0 and tostring(data.version) or nil
	store:SetAttribute("Version", tostring(data.version) .. (failed > 0 and ("-" .. os.time()) or ""))
	print(("[OnBlox] %d dance dari website dimuat (%d emote dibongkar, %d gagal, %s)"):format(#list, converted, failed, reason))
end

-- satu pengambilan dalam satu waktu (membongkar emote bisa makan beberapa detik)
local function fetch(reason)
	if busy then
		return
	end
	busy = true
	local ok, err = pcall(fetchNow, reason)
	busy = false
	if not ok then
		warn("[OnBlox] Error:", err)
	end
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
