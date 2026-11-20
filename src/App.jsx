
import { useEffect, useState, useRef } from "react";

import {
  Cloud,
  LayoutDashboard,
  Folder,
  Clock,
  Star,
  Trash2,
  Settings,
  Search,
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  Download,
  Plus,
  HardDrive,
  Menu,
  LogOut
} from "lucide-react";

import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import "./App.css";

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function getFileIcon(name) {
  const extension = name.split(".").pop().toUpperCase();

  if (["PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(extension)) {
    return { icon: Image, color: "blue" };
  }

  if (["XLS", "XLSX", "CSV", "PPT", "PPTX"].includes(extension)) {
    return { icon: FileSpreadsheet, color: "orange" };
  }

  return { icon: FileText, color: "red" };
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  const fileInputRef = useRef(null);

  // Check login session
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error(error);
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load actual files from Supabase database
  async function loadFiles() {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setNotice("Could not load files: " + error.message);
      return;
    }

    setFiles(data || []);
  }

  useEffect(() => {
    if (session) {
      loadFiles();
    } else {
      setFiles([]);
    }
  }, [session]);

  // Upload files to Supabase Storage
  async function handleUpload(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selectedFiles.length) return;

    setUploading(true);
    setNotice("");

    try {
      for (const file of selectedFiles) {
        const storagePath =
          `${session.user.id}/${Date.now()}-${file.name}`;

        // Upload actual file
        const { error: uploadError } = await supabase.storage
          .from("user-files")
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Save file information in database
        const { error: databaseError } = await supabase
          .from("files")
          .insert({
            user_id: session.user.id,
            name: file.name,
            storage_path: storagePath,
            size: file.size,
            content_type: file.type
          });

        if (databaseError) {
          await supabase.storage
            .from("user-files")
            .remove([storagePath]);

          throw databaseError;
        }
      }

      setNotice("Files uploaded successfully!");
      await loadFiles();

    } catch (error) {
      setNotice("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  // Download a file
  async function handleDownload(file) {
    setNotice("");

    const { data, error } = await supabase.storage
      .from("user-files")
      .createSignedUrl(file.storage_path, 60);

    if (error) {
      setNotice("Download failed: " + error.message);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  // Delete a file
  async function handleDelete(file) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${file.name}?`
    );

    if (!confirmed) return;

    setNotice("");

    const { error: storageError } = await supabase.storage
      .from("user-files")
      .remove([file.storage_path]);

    if (storageError) {
      setNotice("Delete failed: " + storageError.message);
      return;
    }

    const { error: databaseError } = await supabase
      .from("files")
      .delete()
      .eq("id", file.id);

    if (databaseError) {
      setNotice("File removed from storage, but database cleanup failed: " + databaseError.message);
      return;
    }

    setNotice("File deleted successfully!");
    await loadFiles();
  }

  // Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice(error.message);
    }
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading CloudVault...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalBytes = files.reduce(
    (total, file) => total + Number(file.size || 0),
    0
  );

  return (
    <div className="app-container">

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">
            <Cloud size={25} />
          </div>
          <span>CloudVault</span>
        </div>

        <button
          className="upload-button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus size={19} /> New Upload
        </button>

        <p className="nav-heading">WORKSPACE</p>

        <nav className="navigation">
          <a className="nav-item active">
            <LayoutDashboard /> Overview
          </a>

          <a className="nav-item">
            <Folder /> My Files
          </a>

          <a className="nav-item">
            <Clock /> Recent
          </a>

          <a className="nav-item">
            <Star /> Starred
          </a>

          <a className="nav-item">
            <Trash2 /> Trash
          </a>
        </nav>

        <div className="sidebar-bottom">

          <a className="nav-item">
            <Settings /> Settings
          </a>

          <div className="storage-mini">
            <HardDrive size={21} />
            <div>
              <strong>Storage</strong>
              <p>{formatSize(totalBytes)} used</p>
            </div>
          </div>

        </div>

      </aside>

      <main className="main-content">

        <header className="topbar">

          <button className="mobile-menu">
            <Menu />
          </button>

          <div className="breadcrumb">
            Workspace / <strong>Overview</strong>
          </div>

          <div className="top-actions">

            <div className="search-box">
              <Search size={18} />
              <input
                placeholder="Search your files..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>

            <div className="avatar">
              {session.user.email?.charAt(0).toUpperCase() || "U"}
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              style={{ border: "none", background: "transparent", cursor: "pointer" }}
            >
              <LogOut size={20} />
            </button>

          </div>

        </header>

        <section className="dashboard">

          <div className="welcome-section">

            <div>
              <p className="eyebrow">YOUR PERSONAL CLOUD</p>
              <h1>Welcome to CloudVault 👋</h1>
              <p className="subtitle">
                Manage your files securely, all in one place.
              </p>
              <small>Logged in as: {session.user.email}</small>
            </div>

            <button
              className="primary-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={18} />
              {uploading ? "Uploading..." : "Upload Files"}
            </button>

            <input
              type="file"
              multiple
              hidden
              ref={fileInputRef}
              onChange={handleUpload}
            />

          </div>

          {notice && (
            <p style={{
              padding: "12px",
              background: "#f3efff",
              color: "#7045d6",
              borderRadius: "8px",
              overflowWrap: "anywhere"
            }}>
              {notice}
            </p>
          )}

          <div className="stats-grid">

            <div className="stat-card">
              <div className="stat-icon purple">
                <HardDrive />
              </div>
              <p>Total Storage Used</p>
              <h2>{formatSize(totalBytes)}</h2>
              <small>Actual uploaded file storage</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">
                <Folder />
              </div>
              <p>Total Files</p>
              <h2>{files.length}</h2>
              <small>Files in your cloud</small>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">
                <Image />
              </div>
              <p>Shared Files</p>
              <h2>0</h2>
              <small>Sharing feature coming soon</small>
            </div>

          </div>

          <section className="files-section">

            <div className="section-header">
              <div>
                <h2>My Cloud Files</h2>
                <p>Your files stored in Supabase</p>
              </div>
            </div>

            <div className="file-table">

              <div className="file-row table-heading">
                <span>Name</span>
                <span>Type</span>
                <span>Size</span>
                <span>Modified</span>
                <span>Actions</span>
              </div>

              {filteredFiles.map(file => {
                const { icon: Icon, color } = getFileIcon(file.name);
                const extension = file.name.split(".").pop().toUpperCase();

                return (
                  <div className="file-row" key={file.id}>

                    <div className="file-name">
                      <div className={`file-icon ${color}`}>
                        <Icon size={21} />
                      </div>
                      <strong>{file.name}</strong>
                    </div>

                    <span>{extension}</span>
                    <span>{formatSize(Number(file.size))}</span>
                    <span>
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="more-button"
                        title="Download"
                        onClick={() => handleDownload(file)}
                      >
                        <Download size={18} />
                      </button>

                      <button
                        className="more-button"
                        title="Delete"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                  </div>
                );
              })}

              {filteredFiles.length === 0 && (
                <p style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#999"
                }}>
                  {search ? "No matching files found." : "No files uploaded yet. Click Upload Files to get started."}
                </p>
              )}

            </div>

          </section>

          <footer>
            © 2026 CloudVault. Your files, your cloud.
          </footer>

        </section>

      </main>

    </div>
  );
}

export default App;
