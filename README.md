Each subfolder is for a specific machine

X1Nano1340/etc_nixos

    cd /opt
    git checkout ...
    cd /etc
    ln -s /opt/nixos-config/X1Nano1340/etc_nixos nixos
    file /etc/nixos/configuration.nix

X1Nano1340/joseph

    cd /home/joseph/.config
    ln -s /opt/nixos-config/X1Nano1340/joseph nixpkgs
    file ~/.config/nixpkgs/config.nix


# General "Getting started" advice

nmcli radio wifi
sudo nmcli dev wifi connect 0000000000000000000000000000005A password "firesheep"
nmcli dev wifi list

sudo nixos-rebuild switch --upgrade
nix-collect-garbage # -d
nix-store --optimize
