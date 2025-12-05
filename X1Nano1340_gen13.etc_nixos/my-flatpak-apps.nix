let
  # External let binding to fetch nix-flatpak without 
  # causing infinite recursion.
  pkgs = import <nixpkgs> {};
  
  nix-flatpak = pkgs.fetchFromGitHub {
    owner = "gmodena";
    repo = "nix-flatpak";
    rev = "v0.6.0";
    hash = "sha256-iAVVHi7X3kWORftY+LVbRiStRnQEob2TULWyjMS6dWg=";
  };
in

{ pkgs, ... }:

{
  imports = [
    "${nix-flatpak}/modules/nixos.nix"
  ];

  # Enable flatpak service (required for nix-flatpak)
  services.flatpak.enable = true;

  # Configure nix-flatpak with demo applications
  services.flatpak = {
    packages = [
      # https://flathub.org/en/apps/app.zen_browser.zen
      "app.zen_browser.zen"
    ];
  };
}

