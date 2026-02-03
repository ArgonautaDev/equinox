use tauri::AppHandle;

#[cfg(unix)]
pub fn lock_process_memory(_app: &AppHandle) {
    use libc::{mlockall, MCL_CURRENT, MCL_FUTURE};

    // Attempt to lock all current and future memory pages to RAM.
    // This prevents the OS from swapping sensitive data (keys) to disk.
    unsafe {
        let result = mlockall(MCL_CURRENT | MCL_FUTURE);
        if result != 0 {
            // This is expected on many systems without root privileges or high ulimit.
            // We log it as a warning but do not crash the app, as functional app > perfect security in user-space.
            #[cfg(debug_assertions)]
            eprintln!("⚠️ Memory Locking (mlockall) failed. Run as root or increase ulimit -l.");
        } else {
            #[cfg(debug_assertions)]
            println!("🔐 Memory Locked: Swap disabled for this process.");
        }
    }
}

#[cfg(not(unix))]
pub fn lock_process_memory(_app: &AppHandle) {
    // Windows implementation usually requires SetProcessWorkingSetSize or VirtualLock
    // For MVP phase, we focus on Unix/macOS logic primarily as requested.
    // TODO: Implement Windows VirtualLock.
    #[cfg(debug_assertions)]
    println!("ℹ️ Memory Locking not yet implemented for this OS.");
}
