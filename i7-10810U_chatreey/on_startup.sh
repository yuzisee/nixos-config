#!/bin/bash

# (1) Automount Linux/Win Shared Data Partition
# https://help.ubuntu.com/community/AutomaticallyMountPartitions
udisksctl mount --block-device /dev/disk/by-uuid/59DB9A93282A9F1E

# (2) Set HDMI as default audio output device
# https://askubuntu.com/questions/1038490/how-do-you-set-a-default-audio-output-device-in-ubuntu/1207638#1207638

until p=$(pidof pulseaudio)
do
        sleep 1.5
done

sleep 1.5
pactl set-default-sink 'alsa_output.pci-0000_00_1f.3.hdmi-stereo-extra1'

# https://unix.stackexchange.com/questions/203339/light-locker-run-script-on-screen-lock-unlock
## gdbus monitor --system --dest org.freedesktop.login1 --object-path /org/freedesktop/login1/session/c2
# dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 'org.freedesktop.login1.Manager.ListSessions'

# /org/freedesktop/login1/session/auto   /org/freedesktop/login1/session/c2 
# /org/freedesktop/login1/session/c1     /org/freedesktop/login1/session/self 

# https://bbs.archlinux.org/viewtopic.php?id=188834
until p=$(pidof xfsettingsd)
do
        sleep 1.5
done

sleep 1.5
# Remap Caps Lock to CTRL
# https://serverfault.com/questions/10437/how-do-you-swap-the-caps-lock-to-control-in-xfce
setxkbmap -option "ctrl:nocaps" 
