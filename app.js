const PUBLIC_VAPID_KEY = 'BKsTf1wxQNiM0tlZUpgzbxoPP-C3phHxs4wEKs7MgK-XJ1vp37vl3YWUNewnNjvTS7I-pHIrGUna2TVpWXmCwpM';
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// 1. Registro del Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW SoundPulse Registrado:', reg.scope))
            .catch(err => console.error('Error SW:', err));
    });
}

// 2. Control Online/Offline
const statusEl = document.getElementById('net-status');
function updateStatus() {
    if (navigator.onLine) {
        statusEl.textContent = '● En línea';
        statusEl.className = 'status-badge online';
    } else {
        statusEl.textContent = '● Modo Offline';
        statusEl.className = 'status-badge offline';
    }
}
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
updateStatus();

// 3. Notificaciones Push vía Servidor Node.js
document.getElementById('btn-notify').addEventListener('click', async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return alert('Tu navegador no soporta Notificaciones Push.');
    }

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
        return alert('Las notificaciones fueron denegadas.');
    }

    try {
        const reg = await navigator.serviceWorker.ready;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
            });
        }

        await fetch('http://localhost:3000/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub)
        });

        await fetch('http://localhost:3000/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: '🎧 SoundPulse - Beatles',
                body: '¡Notificación Disfruta la mejor musica con mayot calidad '
            })
        });

    } catch (error) {
        console.error('Error Push:', error);
        alert('Asegúrate de ejecutar tu servidor Node.js (localhost:3000).');
    }
});

// 4. LÓGICA DEL REPRODUCTOR USANDO TUS 5 IMÁGENES
const audio = document.getElementById('audio-player');
const playBtn = document.getElementById('btn-play');
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const progressBar = document.getElementById('progress-bar');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const albumArt = document.getElementById('album-art');
const fileInput = document.getElementById('file-input');
const playlistEl = document.getElementById('playlist');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');

// Lista cargando tus 5 imágenes exactamente
let playlist = [
    {
        title: "Abbey Road Medley",
        artist: "The Beatles",
        cover: "Icon/The_Beatles_Abbey_Road_album_cover.jpg",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    {
        title: "Let It Be",
        artist: "The Beatles",
        cover: "Icon/The_Beatles_-_Let_It_Be.png",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    },
    {
        title: "With The Beatles",
        artist: "The Beatles",
        cover: "Icon/With-The-Beatles-60-aniversario-1.jpg",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    },
    {
        title: "The Blue Album Classic",
        artist: "The Beatles",
        cover: "Icon/blue-album-the-beatles.jpg",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
    },
    {
        title: "Beatles Collection Hits",
        artist: "The Beatles",
        cover: "Icon/images.jpg",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
    }
];

let currentIndex = 0;

function loadSong(index) {
    const song = playlist[index];
    if (!song) return;

    audio.src = song.url;
    trackTitle.textContent = song.title;
    trackArtist.textContent = song.artist || "Artista Desconocido";

    if (albumArt) {
        albumArt.style.backgroundImage = `url('${song.cover}')`;
    }

    // Media Session API para pantalla de bloqueo
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artist,
            album: 'The Beatles Collection',
            artwork: [{ src: song.cover, sizes: '192x192', type: 'image/png' }]
        });

        navigator.mediaSession.setActionHandler('play', playSong);
        navigator.mediaSession.setActionHandler('pause', pauseSong);
        navigator.mediaSession.setActionHandler('previoustrack', prevSong);
        navigator.mediaSession.setActionHandler('nexttrack', nextSong);
    }

    renderPlaylist();
}

function playSong() {
    audio.play();
    playBtn.textContent = '⏸';
}

function pauseSong() {
    audio.pause();
    playBtn.textContent = '▶';
}

function togglePlay() {
    if (audio.paused) {
        playSong();
    } else {
        pauseSong();
    }
}

function prevSong() {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    loadSong(currentIndex);
    playSong();
}

function nextSong() {
    currentIndex = (currentIndex + 1) % playlist.length;
    loadSong(currentIndex);
    playSong();
}

audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.value = progress;
        currentTimeEl.textContent = formatTime(audio.currentTime);
        durationTimeEl.textContent = formatTime(audio.duration);
    }
});

progressBar.addEventListener('input', () => {
    if (audio.duration) {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
});

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Cargar tus propios mp3
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const url = URL.createObjectURL(file);
        playlist.push({
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Archivo Local",
            cover: "Icon/images.jpg",
            url: url
        });
    });
    renderPlaylist();
});

function renderPlaylist() {
    playlistEl.innerHTML = '';
    playlist.forEach((song, idx) => {
        const li = document.createElement('li');
        if (idx === currentIndex) li.className = 'active';
        li.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.8rem;">
        <div style="width: 38px; height: 38px; border-radius: 6px; background: url('${song.cover}') center/cover no-repeat;"></div>
        <div>
          <div class="song-name">${song.title}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${song.artist}</div>
        </div>
      </div>
    `;
        li.addEventListener('click', () => {
            currentIndex = idx;
            loadSong(currentIndex);
            playSong();
        });
        playlistEl.appendChild(li);
    });
}

playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', prevSong);
nextBtn.addEventListener('click', nextSong);
audio.addEventListener('ended', nextSong);

loadSong(0);