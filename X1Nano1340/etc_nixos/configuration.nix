# Edit this configuration file to define what should be installed on
# your system.  Help is available in the configuration.nix(5) man page
# and in the NixOS manual (accessible by running ‘nixos-help’).

{ config, pkgs, ... }:

{
  imports =
    [ # Include the results of the hardware scan.
      ./hardware-configuration.nix
    ];

  # Bootloader.
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  boot.loader.efi.efiSysMountPoint = "/boot/efi";

  networking.hostName = "X1Nano1340"; # Define your hostname.
  # networking.wireless.enable = true;  # Enables wireless support via wpa_supplicant.

  # Configure network proxy if necessary
  # networking.proxy.default = "http://user:password@proxy:port/";
  # networking.proxy.noProxy = "127.0.0.1,localhost,internal.domain";

  # Enable networking
  # This is enough to use `nmcli radio wifi` and `sudo dev wifi connect ...`
  networking.networkmanager.enable = true;

  # Set your time zone.
  time.timeZone = "America/Los_Angeles";

  # Select internationalisation properties.
  # i18n.defaultLocale = "en_US.utf8";

  xdg.portal.wlr.enable = true;

  # Configure keymap in X11
  # services.xserver = {
  #   layout = "us";
  #   xkbVariant = "";
  # };

  sound.enable = true;
  hardware.pulseaudio.enable = true;

  # Define a user account. Don't forget to set a password with ‘passwd’.
  users.users.joseph = {
    isNormalUser = true;
    description = "Hello there";
    extraGroups = [ "networkmanager" "wheel" "video" ];
    packages = with pkgs; [
      mpv
      remmina
      wev
      maestral
      wlsunset
      i3status-rust
      speedcrunch
      ungoogled-chromium
      epiphany
      librewolf-wayland
      firefox-wayland
      rxvt-unicode
      gh
    ];
  };
  # https://askubuntu.com/questions/222392/remmina-problem-a-valid-certificate-for-the-wrong-name
  # Prefer https://github.com/MaxVerevkin/wl-gammarelay-rs over wlsunset (fewer dependencies, I think)
  # HOWEVER, we have to wait until it has a nixpkg and i3status-rust upgrades to 0.22
  # https://nixos.wiki/wiki/Firefox
  # NOTE: foot is installed by default (along with sway I assume), since it's a Wayland-native terminal
    # https://mikejmoffitt.com/articles/0037-term-compare.html
    # https://lwn.net/Articles/751763/

  # Enable automatic login for the user.
  services.getty.autologinUser = "joseph";

  # Allow unfree packages
  nixpkgs.config.allowUnfree = true;

  # https://nixos.wiki/wiki/Accelerated_Video_Playback
  nixpkgs.config.packageOverrides = pkgs: {
    vaapiIntel = pkgs.vaapiIntel.override { enableHybridCodec = true; };
  };
  hardware.opengl = {
    enable = true;
    extraPackages = with pkgs; [
      intel-media-driver # LIBVA_DRIVER_NAME=iHD
      vaapiIntel         # LIBVA_DRIVER_NAME=i965 (older but works better for Firefox/Chromium)
      vaapiVdpau
      libvdpau-va-gl
    ];
  };
  # How to test:
  #  https://discourse.ubuntu.com/t/enabling-accelerated-video-decoding-in-firefox-on-ubuntu-21-04/22081
  #  https://mastransky.wordpress.com/2021/01/10/firefox-were-finally-getting-hw-acceleration-on-linux/

  # nixos.wiki/wiki/Vim
  # Do not forget to add an editor to edit configuration.nix! The Nano editor is also installed by default.
  # List packages installed in system profile. To search, run:
  # $ nix search wget
  environment.systemPackages = with pkgs; [
    libinput-gestures
    intel-gpu-tools
    vimHugeX
    git
    wlr-randr
    wget
    curl
    file
  ];
  # https://gist.github.com/mschwaig/195fe93ed85dea7aaceaf8e1fc6c0e99

  # Some programs need SUID wrappers, can be configured further or are
  # started in user sessions.
  # programs.mtr.enable = true;
  # programs.gnupg.agent = {
  #   enable = true;
  #   enableSSHSupport = true;
  # };
  programs.sway.enable = true;
  # https://discourse.nixos.org/t/where-is-callpackage-defined-exactly-part-2/12524/6
  # https://nixos.org/guides/nix-pills/callpackage-design-pattern.html
  # environment.etc."sway/config".source = lib.mkForce (pkgs.callPackage ./etc_conf/build-sway-config.nix {pkgs.writeText});
  # https://nixos.wiki/wiki/Sway
  # Added extraGroups = [ "video" ]; to joseph above
  programs.light.enable = true;

  # https://nixos.wiki/wiki/Fonts
  # https://ld.reddit.com/r/NixOS/comments/lf6de0/some_config_questions/gmlzirz/
  # https://git.sr.ht/~cyplo/dotfiles/tree/83ddcc09dc68389b129d598722eca9e90a6dff33/item/nixos/i3/i3.nix
  fonts.fonts = with pkgs; [
    powerline-fonts
    font-awesome
  ];

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
  system.stateVersion = "22.05"; # Did you read the comment?

  # https://nixos.org/manual/nixos/stable/index.html#sec-upgrading
  # https://nixos.org/manual/nixos/stable/index.html#sec-nix-gc
  # STANDARD OPERATIONS
  # >>> nixos-rebuild switch --upgrade
  # >>> nix-collect-garbage  # -d if you are ready to remove old configurations
  # >>> nix-store --optimise

}
