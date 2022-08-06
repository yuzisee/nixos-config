{ writeText }:

# https://discourse.nixos.org/t/can-i-configure-a-modified-sway-config/7890/3
# Usage
#   environment.etc."sway/config".source = lib.mkForce (pkgs.callPackage ./write-sway-conf.nix {pkgs.writeText});

# writeText "sway.conf" ''
#   set $mod Mod4
#   # ...
#   exec "${kanshi}/bin/kanshi"
#   # ...
# ''

# ACCORDING TO...
# ls /nix/store/*-sway-*/etc/sway
# INSTRUCTIONS ARE:
# Copy /etc/sway/config to ~/.config/sway/config and edit it to your liking.

# https://discourse.nixos.org/t/how-to-use-pkg-writetext/19098
