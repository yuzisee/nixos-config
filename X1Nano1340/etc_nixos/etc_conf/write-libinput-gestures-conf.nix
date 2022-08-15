{ writeText }:

# https://discourse.nixos.org/t/can-i-configure-a-modified-sway-config/7890/3
# Usage
#   environment.etc."".source = lib.mkForce (pkgs.callPackage ./write-libinput-gestures.nix {pkgs.writeText});

# https://discourse.nixos.org/t/how-to-use-pkg-writetext/19098
# https://edolstra.github.io/talks/build-systems-nov-2019.pdf
writeText "libinput-gestures.conf" ''
# https://github.com/bulletmark/libinput-gestures/blob/master/libinput-gestures.conf
swipe left 4 swaymsg t command workspace next_on_output
swipe left 3 swaymsg t command workspace next_on_output
swipe right 4 swaymsg t command workspace next_on_output
swipe right 3 swaymsg t command workspace next_on_output

swipe up 4 swaymsg t command focus prev
swipe up 3 swaymsg t command focus prev
swipe down 4 swaymsg t command focus next
swipe down 3 swaymsg t command focus next
''

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
