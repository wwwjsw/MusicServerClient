class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.playlist = [];
    this.currentTrack = 0;
    this.isPlaying = false;
    // this.serverUrl = "http://localhost:8080";
    this.serverUrl = "http://192.168.1.9:8080";
    // Initialize UI elements
    this.initializeElements();
    // Set up event listeners
    this.setupEventListeners();
    // Load initial playlist
    this.loadPlaylist();
    // Set up playlist click listener
    this.setupPlaylistListener();
  }

  initializeElements() {
    this.playlistElement = document.getElementById("playlist");
    this.playButton = document.getElementById("playButton");
    this.prevButton = document.getElementById("prevButton");
    this.nextButton = document.getElementById("nextButton");
    this.progressBar = document.getElementById("progressBar");
    this.progressContainer = document.getElementById("progressContainer");
    this.currentTimeElement = document.getElementById("currentTime");
    this.durationElement = document.getElementById("duration");
    this.songInfoElement = document.getElementById("songInfo");
    this.volumeSlider = document.getElementById("volumeSlider");
  }

  setupEventListeners() {
    // Playback control events
    this.playButton.addEventListener("click", () => this.togglePlay());
    this.prevButton.addEventListener("click", () => this.playPrevious());
    this.nextButton.addEventListener("click", () => this.playNext());
    this.volumeSlider.addEventListener("input", (e) =>
      this.setVolume(e.target.value),
    );

    // Audio element events
    this.audio.addEventListener("timeupdate", () => this.updateProgress());
    this.audio.addEventListener("ended", () => this.playNext());
    this.audio.addEventListener("loadedmetadata", () => {
      this.durationElement.textContent = this.formatTime(this.audio.duration);
    });

    // Progress bar click event
    this.progressContainer.addEventListener("click", (e) => this.seek(e));
  }

  async loadPlaylist() {
    try {
      const response = await fetch(`${this.serverUrl}/music`);
      const data = await response.json();

      this.playlist = data.data;
      this.renderPlaylist();
    } catch (error) {
      // TODO: Remove mock data usage in production
      console.warn("FAILED TO LOAD PLAYLIST FROM SERVER, USING MOCK DATA.");
      const mockSimplePlaylist =
        require("../data/mock-simple-playlist.json").data;
      this.playlist = mockSimplePlaylist;
      this.renderPlaylist();
      console.error("Error loading playlist:", error);
    }
  }

  renderPlaylist() {
    this.playlistElement.innerHTML = this.playlist
      .map(
        (track, index) => `
                <div class="playlist-item ${index === this.currentTrack ? "active" : ""}"
                     data-index="${index}">
                    <span>${track.title}</span>
                    <span>${track.artist}</span>
                </div>
            `,
      )
      .join("");
  }

  setupPlaylistListener() {
    this.playlistElement.addEventListener("click", (e) => {
      const playlistItem = e.target.closest(".playlist-item");
      if (playlistItem) {
        const index = parseInt(playlistItem.dataset.index);
        this.playTrack(index);
      }
    });
  }

  async playTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;

    this.currentTrack = index;
    const track = this.playlist[index];

    // Update UI
    this.songInfoElement.textContent = `${track.title} - ${track.artist}`;
    this.renderPlaylist();

    try {
      // Set up audio source with range request support
      const response = await fetch(
        `${this.serverUrl}/music?audio_id=${track.id}`,
        {
          headers: {
            Range: "bytes=0-",
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        this.audio.src = url;
        this.audio.play();
        this.isPlaying = true;
        this.playButton.textContent = "⏸";
      }
    } catch (error) {
      console.error("Error playing track:", error);
    }
  }

  togglePlay() {
    if (this.audio.src) {
      if (this.isPlaying) {
        this.audio.pause();
        this.playButton.textContent = "▶";
      } else {
        this.audio.play();
        this.playButton.textContent = "⏸";
      }
      this.isPlaying = !this.isPlaying;
    } else if (this.playlist.length > 0) {
      this.playTrack(0);
    }
  }

  playPrevious() {
    const newIndex =
      (this.currentTrack - 1 + this.playlist.length) % this.playlist.length;
    this.playTrack(newIndex);
  }

  playNext() {
    const newIndex = (this.currentTrack + 1) % this.playlist.length;
    this.playTrack(newIndex);
  }

  updateProgress() {
    const progress = (this.audio.currentTime / this.audio.duration) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.currentTimeElement.textContent = this.formatTime(
      this.audio.currentTime,
    );
  }

  seek(event) {
    const rect = this.progressContainer.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;
    this.audio.currentTime = pos * this.audio.duration;
  }

  setVolume(value) {
    this.audio.volume = value / 100;
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
}

// Initialize player when document is loaded
let player;
document.addEventListener("DOMContentLoaded", () => {
  player = new AudioPlayer();
});
