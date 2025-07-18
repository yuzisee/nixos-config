# Do not modify this file!  It was generated by ‘nixos-generate-config’
# and may be overwritten by future invocations.  Please make changes
# to /etc/nixos/configuration.nix instead.
{ config, lib, pkgs, modulesPath, ... }:

{
  imports =
    [ (modulesPath + "/installer/scan/not-detected.nix")
    ];

  boot.initrd.availableKernelModules = [ "xhci_pci" "thunderbolt" "nvme" "usb_storage" "sd_mod" ];
  boot.initrd.kernelModules = [ ];
  boot.kernelModules = [ ];
  boot.extraModulePackages = [ ];

  # suspend to RAM (e.g. S3 sleep) rather than s2idle (e.g. "suspend-to-idle")
  boot.kernelParams = [ "mem_sleep_default=deep" ];

  # https://discourse.nixos.org/t/prevent-laptop-from-suspending-when-lid-is-closed-if-on-ac/12630/7

  # nvme0n1p7
  fileSystems."/" =
    { device = "/dev/disk/by-uuid/b9efe261-c832-4c8e-b501-3516388b4e8a";
      fsType = "ext4";
    };

  # nvme0n1p6
  fileSystems."/nix" =
    { device = "/dev/disk/by-uuid/61961f2f-4891-443a-b7e9-69df637bca41";
      fsType = "xfs";
    };

  # /boot is nvme0n1p5 and /boot/efi is nvme0n1p1
  fileSystems."/boot/efi" =
    { device = "/dev/disk/by-uuid/D88C-FB29";
      fsType = "vfat";
    };

  # nvme0n1p3
  swapDevices =
    [ { device = "/dev/disk/by-uuid/1668c950-4482-4183-a614-4bb655d92e87"; }
    ];

  # Enables DHCP on each ethernet and wireless interface. In case of scripted networking
  # (the default) this is the recommended approach. When using systemd-networkd it's
  # still possible to use this option, but it's recommended to use it in conjunction
  # with explicit per-interface declarations with `networking.interfaces.<interface>.useDHCP`.
  networking.useDHCP = lib.mkDefault true;
  # networking.interfaces.wlp0s20f3.useDHCP = lib.mkDefault true;

  powerManagement.cpuFreqGovernor = lib.mkDefault "powersave";
  hardware.cpu.intel.updateMicrocode = lib.mkDefault config.hardware.enableRedistributableFirmware;
  # high-resolution display
  # hardware.video.hidpi.enable = lib.mkDefault true;
}
