local wezterm = require "wezterm"

-- Repo-specific theme hook; falls back to Tanzanite if unknown.
_G.BIBLIOKIT_WEZTERM_THEME = "biblio_asset_creator"

return dofile((wezterm.home_dir or ".") .. "/.config/wezterm/wezterm.lua")
