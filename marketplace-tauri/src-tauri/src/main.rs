// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
const API_BASE: &str = "http://192.168.1.100:8000";

fn main() {
  app_lib::run();
}
