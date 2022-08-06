{ writeText }:

# https://discourse.nixos.org/t/can-i-configure-a-modified-sway-config/7890/3
# Usage
#   environment.etc."sway/config".source = lib.mkForce (pkgs.callPackage ./write-sway-conf.nix {pkgs.writeText});

writeText "sway.conf" ''
  set $mod Mod4
  # ...
  exec "${kanshi}/bin/kanshi"
  # ...
''

# https://discourse.nixos.org/t/how-to-use-pkg-writetext/19098
