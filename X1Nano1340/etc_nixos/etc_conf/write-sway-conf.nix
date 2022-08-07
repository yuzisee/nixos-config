{ writeText }:

# https://discourse.nixos.org/t/can-i-configure-a-modified-sway-config/7890/3
# Usage
#   environment.etc."sway/config".source = lib.mkForce (pkgs.callPackage ./write-sway-conf.nix {pkgs.writeText});

# https://discourse.nixos.org/t/how-to-use-pkg-writetext/19098
# https://edolstra.github.io/talks/build-systems-nov-2019.pdf
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

# Fancier things people have done with sway
# https://github.com/colemickens/nixcfg/blob/main/mixins/sway.nix
# https://git.sr.ht/~jshholland/nixos-configs/tree/master/home/sway.nix
# https://www.reddit.com/r/unixporn/comments/lepmss/comment/gmkkdjr/
# https://github.com/nix-community/home-manager/blob/0e2f7876d2f2ae98a67d89a8bef8c49332aae5af/modules/services/window-managers/i3-sway/lib/options.nix
# https://discourse.nixos.org/t/sway-from-home-manager/8703
