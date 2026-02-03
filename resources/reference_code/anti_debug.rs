use tauri::AppHandle;

#[cfg(target_os = "macos")]
#[allow(dead_code)]
mod macos {
    use libc::{c_int, ptrace};

    // PT_DENY_ATTACH is 31 on macOS (x86_64/arm64)
    // It is a standard anti-debug flag that kills the process if traced.
    const PT_DENY_ATTACH: c_int = 31;

    pub fn deny_attach() {
        unsafe {
            let res = ptrace(PT_DENY_ATTACH, 0, std::ptr::null_mut(), 0);
            if res != 0 {
                // If ptrace fails, something is weird, but usually
                // calling it with PT_DENY_ATTACH causes immediate exit if attached.
                eprintln!("⚠️ Anti-Debug check failed or ignored.");
            }
        }
    }
}

pub fn check(_app: &AppHandle) {
    // Only active in RELEASE build for safety.
    // In DEBUG, we want to be able to debug!
    #[cfg(not(debug_assertions))]
    {
        #[cfg(target_os = "macos")]
        {
            macos::deny_attach();
        }

        #[cfg(not(target_os = "macos"))]
        {
            // TODO: Implement for Windows/Linux
            // Windows: IsDebuggerPresent()
        }
    }

    #[cfg(debug_assertions)]
    {
        println!("🛡️ Anti-Debug: Disabled in Debug Mode (Safe to Attach)");
    }
}
