Wi-Fi MAC 5C:E4:2A:3D:D4:7F

(Windows cursor inverted)

xfce Clock Panel tooltop format:
  "%I:%M%P on %A %b %d, %Y"
  docs.xfce.org/xfce/xfce4-panel/4.16/clock
  via unix `date` + GDateTime (gnome glib)

choco gvim = vim-tux.portable

Nibbler:
  Analysis
    Winrate POV -> Current
    Centipawn POV -> White
    Win / draw / loss POV -> White
  Display
    Always show actual move (if known)
    ...with outline
    Infobox stats
      Centipawns
      N - nodes (absolute)
      Depth (A/B only)
      P - policy
      Q - evaluation
      WDL - win / draw / loss
      Linebreak before stats
      Draw PV on mouseover
      Draw PV method > Single move
  Dev
    engine.json ("NNCacheSize": "7000000") ...
      ... set to 9000000 seems to be ~8500MiB total memory with also 25M node tree of a 192x15 network
      # https://groups.google.com/g/lczero/c/KN8ZXIv0Fh0 says 230M nodes is 64GiB memory; if that's true... 230k nodes should be 64MiB of memory and we'd need ~1.4GiB for 5M nodes.
      # https://github.com/LeelaChessZero/lc0/issues/801 says 500MiB is 2.188M nodes
    Disable Hardware Acceleration for GUI
