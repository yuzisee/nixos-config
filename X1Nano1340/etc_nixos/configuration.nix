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
  # NOTE: chessx doesn't work on wayland right now
  # Q: https://gitlab.com/snakedye/salut/-/wikis/Home might be better than mako
  users.users.joseph = {
    isNormalUser = true;
    description = "Hello there";
    extraGroups = [ "networkmanager" "wheel" "video" "input" ];
    packages = with pkgs; [
      # ffmpeg-headless
      inkscape
      gmailctl
      kdiff3
      # espanso  # Waiting for https://github.com/NixOS/nixpkgs/pull/208949
      filezilla
      nomachine-client  # use nxplayer command after install
      # x2goclient # TERRIBLE
      # dillo
      netsurf.browser
      # https://www.ekioh.com/flow-browser/
      # libsForQt5.konqueror
      qutebrowser-qt6
      # Wayland epiphany has some serious memory leaks (like 7GiB+), it's essentially unusuable
      # epiphany
      doublecmd
      scid-vs-pc
      mupdf
      geeqie
      duc
      zoom-us
      mpv
      remmina
      wev
      maestral
      mako
      shotman
      wlsunset
      i3status-rust
      speedcrunch
      ungoogled-chromium
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

  # https://nixos.org/manual/nixos/stable/options.html#opt-services.auto-cpufreq.enable
  # https://ld.reddit.com/r/linux/comments/zwar52/haha_suck_on_dat_windows_finally_got_idle_power/
  # https://github.com/NixOS/nixpkgs/blob/master/nixos/modules/services/hardware/tlp.nix
  # https://www.linuxuprising.com/2020/01/auto-cpufreq-is-new-cpu-speed-and-power.html
  services.auto-cpufreq.enable = true;
  # Enable automatic login for the user.
  services.getty.autologinUser = "joseph";

  # [REASONING]
  #   we don't want it to start at startup, an certainly not without `-c` providing a custom /etc/libinput-gestures.conf
  # [SOLVED]
  #   at the time of writing this: running at startup without -c would add bindings for super+s and Alt+Right, Alt+Left, etc. which we don't want
  # [SEE ALSO]
  #   under `environment.etc` much further below we write out own etc/libinput-gestures.conf and we'll invoke it ourselves from ^X1Nano1340/dotfiles/sway/config using `libinput-gestures -c /etc/libinput-gestures.conf`

  # https://nixos.org/manual/nixos/stable/options.html#opt-systemd.services._name_.enable
  systemd.services.libinput-gestures.enable = false;

      # https://ld.reddit.com/r/NixOS/comments/cxzku1/overlaypackageoverride_to_change_installphase/
#
# >>> sudo nix-env -qa libinput-gestures --json
# {
#   "nixos.libinput-gestures": {
#     "name": "libinput-gestures-2.73",
#     "pname": "libinput-gestures",
#     "version": "2.73",
#     "system": "x86_64-linux",
#     "outputName": "out",
#     "outputs": {
#       "out": null
#     }
#   }
# }
        # https://github.com/NixOS/nixpkgs/blob/524b2a65251dad3018f168af2049f5a29b7d5da8/lib/strings.nix#L131
        # https://github.com/NixOS/nixpkgs/blob/524b2a65251dad3018f168af2049f5a29b7d5da8/lib/strings.nix#L537
        # https://nixos.org/manual/nix/stable/language/values.html
        # https://github.com/NixOS/nixpkgs/blob/524b2a65251dad3018f168af2049f5a29b7d5da8/lib/lists.nix#L143
  # [OBJECTIVE]
  #   remove the "... libinput-gestures-setup -d ... line from pkgs.libinput-gestures.installPhase
  # packageOverrides = pkgs: {
#       libinput-gestures = pkgs.libinput-gestures.override { installPhase = builtins.concatStringsSep "\n" (builtins.filter (xstep: builtins.hasInfix " libinput-gestures-setup -d " xstep) (builtins.splitString "\n" pkgs.libinput-gestures.installPhase)); };
        # https://github.com/ryantm/nixpkgs/blob/master/pkgs/tools/inputmethods/libinput-gestures/default.nix
# https://stackoverflow.com/questions/58243712/how-to-install-systemd-service-on-nixos


  # Allow unfree packages
  nixpkgs.config.allowUnfree = true;

  nixpkgs.config.chromium = {
    enableWideVine = true;
  };
  # https://github.com/NixOS/nixpkgs/issues/54723

  # https://stackoverflow.com/questions/36000514/how-to-override-2-two-packages-in-nixos-configuration-nix

  # https://github.com/NixOS/nixos-hardware/blob/556101ff85bd6e20900ec73ee525b935154bc8ea/common/gpu/intel/default.nix
  # environment.variables = {
    # VDPAU_DRIVER = lib.mkIf config.hardware.opengl.enable (lib.mkDefault "va_gl");
    # https://amigotechnotes.wordpress.com/2022/07/20/enable-firefox-hardware-video-acceleration-on-ubuntu/
    # MOZ_ENABLE_WAYLAND = "1";
  # };
  # https://github.com/intel/intel-hybrid-driver is discontinued
  # nixpkgs.config.packageOverrides = pkgs: {
    # # https://nixos.wiki/wiki/Accelerated_Video_Playback
    # vaapiIntel = pkgs.vaapiIntel.override { enableHybridCodec = true; };
  # };

  # Additional hardware acceleration
  # https://youtu.be/VuESAFgsOvg?t=612
  # about:config
  #  + media.ffmpeg.vaapi.enabled
  #  + layers.acceleration.force-enabled
  #  + gfx.webrender.all

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

  # https://nixos.org/manual/nixos/stable/release-notes.html
  # 23.05
  #  The catch-all hardware.video.hidpi.enable option was removed. Users on high density displays may want to:
  #  * Set services.xserver.upscaleDefaultCursor to upscale the default X11 cursor for higher resolutions
  #  * Adjust settings under fonts.fontconfig according to preference
  #  * Adjust console.font according to preference, though the kernel will generally choose a reasonably sized font
  # https://github.com/NixOS/nixpkgs/issues/34603
  # https://github.com/NixOS/nixpkgs/issues/57602
  # services.xserver.dpi

  # https://nixos.org/manual/nixos/stable/release-notes.html#sec-release-22.11-notable-changes
  services.udisks2.enable = true;

  # https://nixos.wiki/wiki/Scanners
  hardware.sane.enable = true;

  # nixos.wiki/wiki/Vim
  # Do not forget to add an editor to edit configuration.nix! The Nano editor is also installed by default.
  # List packages installed in system profile. To search, run:
  # $ nix search wget
  environment.systemPackages = with pkgs; [
    xsane
    bashmount
    # https://unix.stackexchange.com/questions/213137/how-to-auto-mount-permanently-mount-external-devices-on-nixos
    # udisks
    libinput-gestures
    usbutils
    intel-gpu-tools
    vimHugeX
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

  environment.etc = {
    # Creates /etc/libinput-gestures.conf
    # Added extraGroups = [ "input" ]; to joseph above
    "libinput-gestures.conf" = {
      text = ''
# https://github.com/bulletmark/libinput-gestures/blob/master/libinput-gestures.conf
gesture swipe left 4 swaymsg -t command workspace prev_on_output
gesture swipe left 3 swaymsg -t command workspace prev_on_output
gesture swipe right 4 swaymsg -t command workspace next_on_output
gesture swipe right 3 swaymsg -t command workspace next_on_output

gesture swipe up 4 swaymsg -t command focus prev
gesture swipe up 3 swaymsg -t command focus prev
gesture swipe down 4 swaymsg -t command focus next
gesture swipe down 3 swaymsg -t command focus next
'';

       # The UNIX file mode bits
       mode = "0444";
    };
  };
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
  services.upower.enable = true;
  services.upower.criticalPowerAction = "Hibernate";

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
