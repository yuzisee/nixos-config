Each subfolder is for a specific machine

X1Nano1340/etc_nixos

    cd /opt
    git checkout ...
    cd /etc
    ln -s /opt/nixos-config/X1Nano1340/etc_nixos nixos
    file /etc/nixos/configuration.nix

X1Nano1340/joseph

    cd /home/joseph/.config
    ln -s /opt/nixos-config/X1Nano1340/dotfiles/nixpkgs
    file ~/.config/nixpkgs/config.nix

    cd /home/joseph/.config
    ln -s /opt/nixos-config/X1Nano1340/dotfiles/sway
    file ~/.config/sway/config

    cd /home/joseph/.config
    ln -s /opt/nixos-config/X1Nano1340/dotfiles/i3status-rust
    file ~/.config/i3status-rust/config.toml

    cd /home/joseph/.config
    ln -s /opt/nixos-config/X1Nano1340/dotfiles/mpv
    file ~/.config/mpv/{mpv,input,script-opts/osc}.conf

    mkdir -p /home/joseph/.config/qutebrowser
    cd /home/joseph/.config/qutebrowser
    ln -s /opt/nixos-config/X1Nano1340/dotfiles/qutebrowser/autoconfig.yml
    file ~/.config/qutebrowser/autoconfig.yml

# TODO
Transpiling (type safety / better error messages) - https://github.com/purenix-org/purenix/blob/main/docs/quick-start.md
Configuration files (superset of homemanager / simpler to get started) - https://github.com/nix-community/impermanence

# Analogies to other package managers
"Derivations" are like "package specs"
https://nixos.org/guides/nix-pills/our-first-derivation.html
## Terminology
https://ianthehenry.com/posts/how-to-learn-nix/glossary/
https://stephank.nl/p/2020-06-01-a-nix-primer-by-a-newcomer.html
https://zero-to-nix.com/concepts

Some configuration is available here but others not...
https://nixos.org/manual/nixos/stable/options.html

## Upgrading
https://www.reddit.com/r/NixOS/comments/izq3nm/nix_channels_differ_for_nixos_global_and_nix_user/

## Tools
sleep 4.0 ; shotman -c region

## General "Getting started" advice

nmcli radio wifi
sudo nmcli dev wifi connect 0000000000000000000000000000005A password "firesheep"
nmcli dev wifi list

nix-collect-garbage -d
sudo nixos-rebuild switch --upgrade
nix-collect-garbage
nix-store --optimize

# System is good, delete old generations
sudo nix-collect-garbage -d
sudo nix-env --delete-generations --profile /nix/var/nix/profiles/system 14d # https://wiki.nixos.org/wiki/Bootloader
# https://old.reddit.com/r/NixOS/comments/10107km/how_to_delete_old_generations_on_nixos/
sudo nixos-rebuild boot

# New Release
sudo nix-channel --add https://nixos.org/channels/nixos-24.11 nixos
