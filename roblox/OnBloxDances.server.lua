--[[
	OnBlox System - Dances (SERVER)
	Taruh di: ServerScriptService > OnBlox > OnBloxDances (Script)
	Butuh:    ServerScriptService > OnBlox > Config (ModuleScript), isinya disalin dari dashboard:
	            return { Url = "...", Key = "obx_...", RefreshSeconds = 60 }
	Syarat:   Game Settings > Security > "Allow HTTP Requests" = ON

	Cara kerja:
	  * Saat server mulai, lalu tiap RefreshSeconds, ambil daftar dance dari website.
	  * Hasilnya ditaruh di ReplicatedStorage > OnBlox > Dances (StringValue berisi JSON)
	    supaya server DAN client (EmoteGui) bisa membacanya.
	  * Atribut "Version" berubah setiap ada dance baru -> sistem dance tinggal mendengarkan
	    Dances:GetAttributeChangedSignal("Version").
	  * Kunci API hanya ada di ServerScriptService (tidak pernah terlihat oleh client).
]]

local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(script.Parent:WaitForChild("Config"))
local REFRESH = math.max(30, tonumber(Config.RefreshSeconds) or 60)

local folder = ReplicatedStorage:FindFirstChild("OnBlox") or Instance.new("Folder")
folder.Name = "OnBlox"
folder.Parent = ReplicatedStorage

local store = folder:FindFirstChild("Dances") or Instance.new("StringValue")
store.Name = "Dances"
store.Value = store.Value ~= "" and store.Value or "[]"
store.Parent = folder

local version = nil

local function fetch()
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
	print(("[OnBlox] %d dance dari website dimuat (versi %s)"):format(#list, version))
end

task.spawn(function()
	while true do
		fetch()
		task.wait(REFRESH)
	end
end)
