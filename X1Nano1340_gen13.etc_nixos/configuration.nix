# Edit this configuration file to define what should be installed on
# your system.  Help is available in the configuration.nix(5) man page
# and in the NixOS manual (accessible by running ‘nixos-help’).

{ config, pkgs, ... }:

{
  imports =
    [ # Include the results of the hardware scan.
      ./hardware-configuration.nix
      ./post-bringup.nix
      ./my-flatpak-apps.nix
    ];

  # Bootloader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  networking.hostName = "nixos"; # Define your hostname.
  # networking.wireless.enable = true;  # Enables wireless support via wpa_supplicant.

  # Configure network proxy if necessary
  # networking.proxy.default = "http://user:password@proxy:port/";
  # networking.proxy.noProxy = "127.0.0.1,localhost,internal.domain";

  # Enable networking
  networking.networkmanager.enable = true;

  # Set your time zone.
  time.timeZone = "America/Vancouver";

  # Select internationalisation properties.
  i18n.defaultLocale = "en_GB.UTF-8";

  # Configure keymap in X11
  services.xserver.xkb = {
    layout = "us";
    variant = "";
  };

  # NIXOS INSTALLER DEFAULTS [before this line]


  # Define a user account. Don't forget to set a password with ‘passwd’.
  # NOTE: chessx doesn't work on wayland right now
  # Q: https://gitlab.com/snakedye/salut/-/wikis/Home might be better than mako
  users.users.joseph = {
    isNormalUser = true;
    description = "Hello there";
    extraGroups = [ "networkmanager" "wheel" "video" "input" ];
    packages = with pkgs; [
      inetutils # for telnet
      # https://github.com/NixOS/nixpkgs/blob/324404fe2c77aec2c7379e672b6081367b15e527/pkgs/top-level/all-packages.nix#L15761-L15763
      yt-dlp-light # excludes: atomicparsley ffmpeg-headless rtmpdump
      freetube
      floorp-bin
      # Can't use python3Minimal because I need SSL for urllib I think? https://github.com/NixOS/nixpkgs/pull/66762#issuecomment-522463717
      python3 # urllib.error.URLError: <urlopen error unknown url type: https>
      brave # Needs: `brave --enable-features=TouchpadOverscrollHistoryNavigation`
      microsoft-edge
      libarchive # for bsdtar command (as long as allowUnfree is also enabled)
      pdfsam-basic
      ffmpeg-headless
      inkscape
      # gmailctl
      kdiff3
      # espanso  # Waiting for https://github.com/NixOS/nixpkgs/pull/208949
      filezilla
      nomachine-client  # use nxplayer command after install
      # x2goclient # TERRIBLE
      # dillo
      # netsurf.browser
      # https://www.ekioh.com/flow-browser/
      # palemoon-bin
      # libsForQt5.konqueror # if you need an older version (for compatibility reasons or whatever)
      kdePackages.konqueror
      # libsForQt5.falkon # if you need an older version (for compatibility reasons or whatever)
      # kdePackages.falkon
      # servo
      # midori
      # ladybird # Executable is 'Ladybird'
      # qutebrowser # This is the "vim-like" one with keyboard navigation
      # Wayland epiphany has some serious memory leaks (like 7GiB+), it's essentially unusuable
      epiphany
      doublecmd
      scid-vs-pc
      mupdf
      geeqie
      duc # disk usage visualizer
      zoom-us
      mpv
      remmina
      wev
      maestral
      mako # notifications daemon
      shotman
      wlsunset
      i3status-rust
      speedcrunch
      # https://wiki.nixos.org/wiki/Chromium
      (ungoogled-chromium.override { enableWideVine = true; })
      # ungoogled-chromium
      librewolf
      firefox
      # librewolf-wayland
      # firefox-wayland
      # https://nixos.org/manual/nixos/stable/release-notes#sec-release-22.11-notable-changes
      rxvt-unicode
      gh
      # https://github.com/swaywm/sway/issues/8361
      dmenu
    ];
  };
  # https://askubuntu.com/questions/222392/remmina-problem-a-valid-certificate-for-the-wrong-name
  # Prefer https://github.com/MaxVerevkin/wl-gammarelay-rs over wlsunset (fewer dependencies, I think)
  # HOWEVER, we have to wait until it has a nixpkg and i3status-rust upgrades to 0.22
  # https://nixos.wiki/wiki/Firefox
  # NOTE: foot is installed by default (along with sway I assume), since it's a Wayland-native terminal
    # https://mikejmoffitt.com/articles/0037-term-compare.html
    # https://lwn.net/Articles/751763/

  # Allow unfree packages
  nixpkgs.config.allowUnfree = true;

  # nixos.wiki/wiki/Vim
  # Do not forget to add an editor to edit configuration.nix! The Nano editor is also installed by default.
  # List packages installed in system profile. To search, run:
  # $ nix search wget
  environment.systemPackages = with pkgs; [
    wl-clipboard # for `wl-copy` and `wl-paste` etc.
    # cifs-utils
    samba # Doesn't provide libsmbclient for doublecmd to use, but these work: smbclient --list 192.168.10.110 && smbclient //192.168.10.110/joseph (and then: cd "Public/Drop Box")
    xsane
    bashmount
    # https://unix.stackexchange.com/questions/213137/how-to-auto-mount-permanently-mount-external-devices-on-nixos
    # udisks
    libinput-gestures
    usbutils
    intel-gpu-tools
    vim-full
    git
    wlr-randr
    wget
    curl
    file
  ];
  # https://gist.github.com/mschwaig/195fe93ed85dea7aaceaf8e1fc6c0e99
  # https://unix.stackexchange.com/questions/500025/how-to-add-a-file-to-etc-in-nixos
  # https://unix.stackexchange.com/questions/541551/how-can-i-reference-the-store-path-of-a-nix-package
  # https://www.reddit.com/r/NixOS/comments/tcm9lg/configuring_neovim_through_configurationnix/
  # https://stackoverflow.com/questions/41007258/how-do-we-refer-to-etc-package-from-nixos-configuration
  # https://ld.reddit.com/r/NixOS/comments/rsddxp/is_there_a_way_to_add_a_symlink_in_specific/
  # https://discourse.nixos.org/t/override-postinstall-for-emacsoverlay/14270
  # sudo nix-env -qa libinput-gestures --json
    # pkgs.libinput-gestures."/etc/libinput-gestures.conf".source = (pkgs.callPackage ./etc_conf/write-libinput-gestures-conf.nix {writeText = writeText;});
  # https://discourse.nixos.org/t/what-does-mkdefault-do-exactly/9028


  # NIXOS UN-MODIFIED [after this line]

  # Some programs need SUID wrappers, can be configured further or are
  # started in user sessions.
  # programs.mtr.enable = true;
  # programs.gnupg.agent = {
  #   enable = true;
  #   enableSSHSupport = true;
  # };

  # List services that you want to enable:

  # Enable the OpenSSH daemon.
  # services.openssh.enable = true;

  # Open ports in the firewall.
  # networking.firewall.allowedTCPPorts = [ ... ];
  # networking.firewall.allowedUDPPorts = [ ... ];
  # Or disable the firewall altogether.
  # networking.firewall.enable = false;

  # This value determines the NixOS release from which the default
  # settings for stateful data, like file locations and database versions
  # on your system were taken. It‘s perfectly fine and recommended to leave
  # this value at the release version of the first install of this system.
  # Before changing this value read the documentation for this option
  # (e.g. man configuration.nix or on https://nixos.org/nixos/options.html).
  system.stateVersion = "25.11"; # Did you read the comment?

}
