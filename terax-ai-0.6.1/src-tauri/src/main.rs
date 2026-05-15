// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::panic;

fn main() {
    // Set a custom panic hook to prevent silent crashes and log the error
    panic::set_hook(Box::new(|info| {
        let location = info.location().map(|l| format!("{}:{}", l.file(), l.line())).unwrap_or_else(|| "unknown location".to_string());
        let payload = info.payload().downcast_ref::<&str>().cloned()
            .or_else(|| info.payload().downcast_ref::<String>().map(|s| s.as_str()))
            .unwrap_or("no panic message");
        
        eprintln!("Panic occurred at {}: {}", location, payload);
        
        // Show native error dialog if possible
        rfd::MessageDialog::new()
            .set_title("Critical Error")
            .set_description(&format!("Cipher encountered a fatal error and must close.\n\nDetails: {}\nLocation: {}", payload, location))
            .set_level(rfd::MessageLevel::Error)
            .show();
    }));

    cipher_lib::run();
}
