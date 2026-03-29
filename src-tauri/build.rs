fn main() {
    println!("cargo:rerun-if-changed=tauri.conf.json");
    println!("cargo:rerun-if-changed=icons");
    #[cfg(target_os = "macos")]
    println!("cargo:rerun-if-changed=Info.plist");

    tauri_build::build()
}
