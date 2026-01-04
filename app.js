const BASE_URL = "https://www.sankavollerei.com";

const container = document.getElementById("comic-container");
const refreshBtn = document.getElementById("refreshBtn");
const modal = document.getElementById("comicModal");
const modalContent = document.getElementById("modalContent");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const topContainer = document.getElementById("top-comic-container");
const recommendedContainer = document.getElementById("recommended-container");
const genreContainer = document.getElementById("genre-container");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const loadMoreContainer = document.getElementById("loadMoreContainer");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const scrollTopBtn = document.getElementById("scrollTopBtn");

const homeView = document.getElementById("home-view");
const historyView = document.getElementById("history-view");
const favoriteView = document.getElementById("favorite-view");
const navHome = document.getElementById("navHome");
const navHistory = document.getElementById("navHistory");
const navFav = document.getElementById("navFav");
const historyContainer = document.getElementById("history-container");
const favoriteContainer = document.getElementById("favorite-container");

let currentComicSlug = "";
let currentComicData = null;
let isReading = false;
let currentPage = 1;
let currentMode = "latest";
let currentFilterSlug = "";

function saveHistory(comicData, chapterSlug) {
  if (!comicData || !comicData.slug) return;

  let metaHistory =
    JSON.parse(localStorage.getItem("komik_history_meta")) || [];

  metaHistory = metaHistory.filter((item) => item.slug !== comicData.slug);

  metaHistory.unshift({
    slug: comicData.slug,
    title: comicData.title,
    cover: comicData.cover,
    rating: comicData.rating,
    type: comicData.type,
    lastChapter: chapterSlug,
    timestamp: new Date().getTime(),
  });
  if (metaHistory.length > 50) metaHistory.pop();
  localStorage.setItem("komik_history_meta", JSON.stringify(metaHistory));

  let history = JSON.parse(localStorage.getItem("komik_history")) || {};
  history[comicData.slug] = chapterSlug;
  localStorage.setItem("komik_history", JSON.stringify(history));

  let readList = JSON.parse(localStorage.getItem("komik_read_list")) || {};
  if (!readList[comicData.slug]) readList[comicData.slug] = [];
  if (!readList[comicData.slug].includes(chapterSlug)) {
    readList[comicData.slug].push(chapterSlug);
    localStorage.setItem("komik_read_list", JSON.stringify(readList));
  }
}

function getLastRead(comicSlug) {
  let history = JSON.parse(localStorage.getItem("komik_history")) || {};
  return history[comicSlug];
}
function getReadList(comicSlug) {
  let readList = JSON.parse(localStorage.getItem("komik_read_list")) || {};
  return readList[comicSlug] || [];
}

function getBookmarks() {
  return JSON.parse(localStorage.getItem("komik_bookmarks")) || {};
}
function isBookmarked(slug) {
  const bookmarks = getBookmarks();
  return bookmarks.hasOwnProperty(slug);
}
function toggleBookmark(comicData) {
  let bookmarks = getBookmarks();
  if (bookmarks[comicData.slug]) delete bookmarks[comicData.slug];
  else bookmarks[comicData.slug] = comicData;
  localStorage.setItem("komik_bookmarks", JSON.stringify(bookmarks));
  return isBookmarked(comicData.slug);
}

function switchTab(tabName) {
  homeView.style.display = "none";
  historyView.style.display = "none";
  favoriteView.style.display = "none";
  navHome.classList.remove("active");
  navHistory.classList.remove("active");
  navFav.classList.remove("active");

  if (tabName === "home") {
    homeView.style.display = "block";
    navHome.classList.add("active");
  } else if (tabName === "history") {
    historyView.style.display = "block";
    navHistory.classList.add("active");
    renderHistoryPage();
  } else if (tabName === "fav") {
    favoriteView.style.display = "block";
    navFav.classList.add("active");
    renderFavoritePage();
  }
  window.scrollTo(0, 0);
}

navHome.addEventListener("click", () => switchTab("home"));
navHistory.addEventListener("click", () => switchTab("history"));
navFav.addEventListener("click", () => switchTab("fav"));

function renderHistoryPage() {
  const data = JSON.parse(localStorage.getItem("komik_history_meta")) || [];
  historyContainer.innerHTML = "";
  if (data.length === 0) {
    historyContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px; color:#64748b;">Belum ada riwayat baca.</div>`;
    return;
  }

  data.forEach((comic) => renderCard(comic, historyContainer, true));
}

function renderFavoritePage() {
  const bookmarks = getBookmarks();
  const data = Object.values(bookmarks);
  favoriteContainer.innerHTML = "";
  if (data.length === 0) {
    favoriteContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px; color:#64748b;">Belum ada komik favorit.</div>`;
    return;
  }

  data.forEach((comic) => renderCard(comic, favoriteContainer, false));
}

function renderCard(comic, targetContainer, isHistory = false) {
  const card = document.createElement("div");
  card.className = "comic-card";
  const hdCover = comic.cover ? comic.cover.split("?")[0] : "";

  let badgeInfo = "";
  if (isHistory && comic.lastChapter) {
    const parts = comic.lastChapter.split("-");
    const num = parts[parts.length - 1];
    badgeInfo = `<i class="fa-solid fa-clock-rotate-left"></i> Ch.${num}`;
  } else {
    badgeInfo = comic.rating
      ? `<i class="fa-solid fa-star"></i> ${comic.rating}`
      : "";
  }

  card.innerHTML = `
        <div class="card-img-wrapper">
            <img src="${hdCover}" class="card-img" loading="lazy" alt="${
    comic.title
  }">
            <span class="card-chapter" style="${
              isHistory ? "background:var(--accent); color:#000;" : ""
            }">${badgeInfo}</span>
        </div>
        <div class="card-info">
            <div class="card-title">${comic.title}</div>
            <div class="card-meta">
                <span class="card-type">${comic.type || "Komik"}</span>
            </div>
        </div>
    `;

  card.addEventListener("click", () => {
    if (isHistory && comic.lastChapter) {
      currentComicSlug = comic.slug;
      currentComicData = {
        title: comic.title,
        cover: comic.cover,
        rating: comic.rating,
        type: comic.type,
        slug: comic.slug,
      };

      modal.classList.add("active");

      fetchChapterImages(comic.lastChapter);
    } else {
      fetchDetail(comic.slug);
    }
  });

  targetContainer.appendChild(card);
}

loadMoreBtn.addEventListener("click", () => {
  currentPage++;
  if (currentMode === "latest") fetchComics(currentPage, true);
  else if (currentMode === "genre")
    fetchComicsByGenre(currentFilterSlug, null, currentPage, true);
  else if (currentMode === "type")
    fetchComicsByType(currentFilterSlug, currentPage, true);
});
searchBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (query) searchComics(query);
});
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const query = searchInput.value.trim();
    if (query) searchComics(query);
  }
});
scrollTopBtn.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "smooth" })
);
window.addEventListener("scroll", () => {
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300)
    scrollTopBtn.classList.add("show");
  else scrollTopBtn.classList.remove("show");
});

async function searchComics(query) {
  switchTab("home");
  currentMode = "search";
  loadMoreContainer.style.display = "none";
  const safeQuery = encodeURIComponent(query);
  container.innerHTML = '<div class="loading">Mencari komik...</div>';
  hideTopSections();
  try {
    const res = await fetch(`${BASE_URL}/comic/bacakomik/search/${safeQuery}`);
    const json = await res.json();
    if (json.success && json.komikList.length > 0) {
      updateMainHeader(
        `<i class="fa-solid fa-magnifying-glass"></i> Hasil: "${query}"`
      );
      renderComics(json.komikList, false);
    } else {
      container.innerHTML =
        '<div class="loading">Komik tidak ditemukan :(</div>';
    }
  } catch (err) {
    container.innerHTML = `<div class="loading">Error: ${err.message}</div>`;
  }
}

async function fetchRecommendedComics() {
  recommendedContainer.innerHTML = '<div class="loading-mini">Memuat...</div>';
  try {
    const res = await fetch(`${BASE_URL}/comic/bacakomik/recomen`);
    const json = await res.json();
    if (json.success && json.komikList) renderRecommended(json.komikList);
    else recommendedContainer.innerHTML = "";
  } catch (err) {
    recommendedContainer.innerHTML = "";
  }
}

function renderRecommended(comics) {
  recommendedContainer.innerHTML = "";
  comics.forEach((comic) => {
    const card = document.createElement("div");
    card.className = "rec-card";
    const hdCover = comic.cover.split("?")[0];
    let displayGenre = comic.genre ? comic.genre.split(",")[0] : "Komik";
    card.innerHTML = `
            <div class="rec-img-wrapper">
                <img src="${hdCover}" class="rec-img" loading="lazy" alt="${comic.title}">
                <div class="rec-rating"><i class="fa-solid fa-star"></i> ${comic.rating}</div>
            </div>
            <div class="rec-title">${comic.title}</div>
            <div class="rec-genre">${displayGenre}</div>
        `;
    card.addEventListener("click", () => fetchDetail(comic.slug));
    recommendedContainer.appendChild(card);
  });
}

async function fetchComicsByType(type, page = 1, isAppend = false) {
  currentMode = "type";
  currentFilterSlug = type;
  hideTopSections();
  let typeName = type.charAt(0).toUpperCase() + type.slice(1);
  if (!isAppend)
    updateMainHeader(
      `<i class="fa-solid fa-layer-group"></i> Tipe: ${typeName}`
    );
  if (!isAppend) {
    container.innerHTML = `<div class="loading">Memuat ${typeName}...</div>`;
    loadMoreContainer.style.display = "none";
  } else
    loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memuat...`;
  try {
    const res = await fetch(`${BASE_URL}/comic/bacakomik/only/${type}/${page}`);
    const json = await res.json();
    if (json.success && json.komikList) {
      renderComics(json.komikList, isAppend);
      loadMoreContainer.style.display = "flex";
      loadMoreBtn.innerHTML = `Lihat Lainnya <i class="fa-solid fa-angle-down"></i>`;
    } else {
      if (!isAppend)
        container.innerHTML =
          '<div class="loading">Data tidak ditemukan.</div>';
      else {
        loadMoreBtn.innerHTML = "Sudah Habis";
        loadMoreBtn.disabled = true;
      }
    }
  } catch (err) {
    if (!isAppend)
      container.innerHTML = `<div class="loading">Error: ${err.message}</div>`;
  }
}

async function fetchGenres() {
  genreContainer.innerHTML = '<div class="loading-mini">...</div>';
  try {
    const res = await fetch(`${BASE_URL}/comic/bacakomik/genres`);
    const json = await res.json();

    if (json.success && json.genres) {
      const blacklist = ["adult", "smut", "ecchi", "mature", "18+"];

      const safeGenres = json.genres.filter((genre) => {
        const genreSlug = genre.slug.toLowerCase();

        return !blacklist.includes(genreSlug);
      });

      renderGenres(safeGenres);
    } else {
      genreContainer.innerHTML = "";
    }
  } catch (err) {
    console.error(err);
    genreContainer.innerHTML = "";
  }
}

function renderGenres(genres) {
  genreContainer.innerHTML = "";
  const allBtn = document.createElement("div");
  allBtn.className = "genre-item";
  allBtn.innerHTML = "All";
  allBtn.onclick = () => resetView();
  genreContainer.appendChild(allBtn);
  genres.forEach((genre) => {
    const chip = document.createElement("div");
    chip.className = "genre-item";
    chip.innerText = genre.title;
    chip.onclick = () => {
      document
        .querySelectorAll(".genre-item")
        .forEach((el) => el.classList.remove("active"));
      chip.classList.add("active");
      currentPage = 1;
      fetchComicsByGenre(genre.slug, genre.title, currentPage, false);
    };
    genreContainer.appendChild(chip);
  });
}

async function fetchComicsByGenre(slug, title, page = 1, isAppend = false) {
  currentMode = "genre";
  currentFilterSlug = slug;
  if (title)
    updateMainHeader(`<i class="fa-solid fa-tag"></i> Genre: ${title}`);
  hideTopSections();
  if (!isAppend) {
    container.innerHTML = `<div class="loading">Memuat Genre...</div>`;
    loadMoreContainer.style.display = "none";
  } else
    loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memuat...`;
  try {
    const res = await fetch(
      `${BASE_URL}/comic/bacakomik/genre/${slug}/${page}`
    );
    const json = await res.json();
    if (json.success && json.komikList) {
      renderComics(json.komikList, isAppend);
      loadMoreContainer.style.display = "flex";
      loadMoreBtn.innerHTML = `Lihat Lainnya <i class="fa-solid fa-angle-down"></i>`;
    } else {
      if (!isAppend)
        container.innerHTML = '<div class="loading">Tidak ada komik.</div>';
      else {
        loadMoreBtn.innerText = "Sudah Habis";
        loadMoreBtn.disabled = true;
      }
    }
  } catch (err) {
    if (!isAppend)
      container.innerHTML = `<div class="loading">Error: ${err.message}</div>`;
  }
}

async function fetchComics(page = 1, isAppend = false) {
  currentMode = "latest";
  if (!isAppend) {
    container.innerHTML = '<div class="loading">Memuat Komik Terbaru...</div>';
    loadMoreContainer.style.display = "none";
  } else
    loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memuat...`;
  try {
    const res = await fetch(`${BASE_URL}/comic/bacakomik/latest/${page}`);
    const json = await res.json();
    if (json.success && json.komikList) {
      renderComics(json.komikList, isAppend);
      loadMoreContainer.style.display = "flex";
      loadMoreBtn.innerHTML = `Lihat Lainnya <i class="fa-solid fa-angle-down"></i>`;
    } else {
      if (!isAppend)
        container.innerHTML =
          '<div class="loading">Gagal: Data tidak ditemukan.</div>';
      else {
        loadMoreBtn.innerHTML = "Sudah Habis";
        loadMoreBtn.disabled = true;
      }
    }
  } catch (err) {
    if (!isAppend)
      container.innerHTML = `<div class="loading">Error Koneksi: ${err.message}</div>`;
  }
}

function renderComics(comics, isAppend) {
  if (!isAppend) container.innerHTML = "";
  comics.forEach((comic) => renderCard(comic, container));
}

async function fetchTopComics() {
  topContainer.innerHTML = '<div class="loading-mini">Memuat...</div>';
  try {
    const res = await fetch(`${BASE_URL}/comic/bacakomik/top`);
    const json = await res.json();
    if (json.success && json.komikList) renderTopComics(json.komikList);
    else topContainer.innerHTML = "";
  } catch (err) {
    topContainer.innerHTML = "";
  }
}

function renderTopComics(comics) {
  topContainer.innerHTML = "";
  comics.slice(0, 10).forEach((comic, index) => {
    const card = document.createElement("div");
    card.className = "top-card";
    const hdCover = comic.cover.split("?")[0];
    card.innerHTML = `
            <div class="top-img-wrapper">
                <span class="top-rank">#${index + 1}</span>
                <img src="${hdCover}" class="top-img" loading="lazy" alt="${
      comic.title
    }">
                <div class="top-rating"><i class="fa-solid fa-star"></i> ${
                  comic.rating
                }</div>
            </div>
            <div class="top-title">${comic.title}</div>
        `;
    card.addEventListener("click", () => fetchDetail(comic.slug));
    topContainer.appendChild(card);
  });
}

async function fetchDetail(slug) {
  isReading = false;
  currentComicSlug = slug;
  modal.classList.add("active");
  modalContent.innerHTML = '<div class="loading">Memuat Detail...</div>';
  modalTitle.innerText = "Detail Komik";
  try {
    const res = await fetch(`${BASE_URL}/comic/bacakomik/detail/${slug}`);
    const json = await res.json();
    const data = json.detail || json.data;
    if (!data) throw new Error("Data tidak ditemukan.");

    modalTitle.innerText = data.title;

    currentComicData = {
      title: data.title,
      cover: data.cover,
      rating: data.rating,
      type: data.type,
      slug: slug,
    };

    let chapters = data.chapters || data.chapter_list || [];
    let isAscending = false;
    let lastReadSlug = getLastRead(slug);
    let readList = getReadList(slug);
    let buttonText = "Chapter Kosong";
    let buttonActionSlug = "";
    let iconClass = "fa-solid fa-ban";

    if (chapters.length > 0) {
      if (lastReadSlug) {
        const lastChapterObj = chapters.find(
          (c) =>
            c.slug === lastReadSlug ||
            getSlugFromUrl(c.endpoint) === lastReadSlug
        );
        let chName = lastChapterObj
          ? lastChapterObj.title || lastChapterObj.name || ""
          : "";
        if (!chName) {
          const parts = lastReadSlug.split("-");
          chName = `Ch ${parts[parts.length - 1]}`;
        }
        chName = chName.replace(/Chapter/i, "Ch").replace(/Episode/i, "Ep");
        buttonText = `Lanjut: ${chName}`;
        buttonActionSlug = lastReadSlug;
        iconClass = "fa-solid fa-clock-rotate-left";
      } else {
        const firstChapter = chapters[chapters.length - 1];
        buttonText = "Mulai Baca Ch.1";
        buttonActionSlug =
          firstChapter.slug || getSlugFromUrl(firstChapter.endpoint);
        iconClass = "fa-solid fa-book-open";
      }
    }

    const isFav = isBookmarked(slug);
    const favClass = isFav ? "active" : "";
    const favIcon = isFav ? "fa-solid fa-heart" : "fa-regular fa-heart";

    modalContent.innerHTML = `
            <div class="detail-header">
                <img src="${data.cover}" class="detail-thumb" alt="${
      data.title
    }">
                <div class="detail-info">
                    <h2>${data.title}</h2>
                    <div class="meta-badges">
                        <span class="badge highlight"><i class="fa-solid fa-star"></i> ${
                          data.rating || "-"
                        }</span>
                        <span class="badge">${data.status || "Unknown"}</span>
                        <span class="badge">${data.type || "Manga"}</span>
                    </div>
                    <div class="action-buttons">
                        <button id="favBtn" class="btn-fav ${favClass}"><i class="${favIcon}"></i></button>
                        <button class="btn-read" onclick="fetchChapterImages('${buttonActionSlug}')"><i class="${iconClass}"></i> ${buttonText}</button>
                    </div>
                </div>
            </div>
            <div class="section-title">Sinopsis</div>
            <p class="detail-synopsis">${
              data.synopsis || "Sinopsis tidak tersedia."
            }</p>
            <div class="chapter-header">
                <div class="section-title">Chapters</div>
                <button id="sortBtn" class="sort-btn"><i class="fa-solid fa-arrow-down-wide-short"></i> Terbaru</button>
            </div>
            <div class="chapter-list" id="chapterList"></div>
        `;

    document.getElementById("favBtn").addEventListener("click", function () {
      const newStatus = toggleBookmark(currentComicData);
      if (newStatus) {
        this.classList.add("active");
        this.innerHTML = '<i class="fa-solid fa-heart"></i>';
      } else {
        this.classList.remove("active");
        this.innerHTML = '<i class="fa-regular fa-heart"></i>';
      }
    });

    const chapterContainer = document.getElementById("chapterList");
    const sortBtn = document.getElementById("sortBtn");

    function renderChapterList() {
      chapterContainer.innerHTML = "";
      if (chapters.length === 0) {
        chapterContainer.innerHTML =
          "<p style='color:#aaa; font-size:0.8rem; text-align:center;'>Chapter kosong.</p>";
        return;
      }
      chapters.forEach((ch) => {
        const btn = document.createElement("div");
        btn.className = "chapter-item";
        const chSlug = ch.slug || getSlugFromUrl(ch.endpoint);
        if (chSlug === lastReadSlug) btn.classList.add("last-read");
        else if (readList.includes(chSlug)) btn.classList.add("read");
        let chapterName = ch.title || ch.name || "";
        if (!chapterName && ch.slug) {
          const parts = ch.slug.split("-");
          chapterName = parts[parts.length - 1];
        }
        chapterName = chapterName
          .replace(/Chapter/i, "Ch")
          .replace(/Episode/i, "Ep");
        btn.innerHTML = `<span class="chapter-number">${chapterName}</span><span class="chapter-date">${
          ch.date || ""
        }</span>`;
        btn.addEventListener("click", () => fetchChapterImages(chSlug));
        chapterContainer.appendChild(btn);
      });
    }

    sortBtn.addEventListener("click", () => {
      isAscending = !isAscending;
      chapters.reverse();
      sortBtn.innerHTML = isAscending
        ? `<i class="fa-solid fa-arrow-up-wide-short"></i> Terlama`
        : `<i class="fa-solid fa-arrow-down-wide-short"></i> Terbaru`;
      renderChapterList();
    });
    renderChapterList();
  } catch (err) {
    modalContent.innerHTML = `<div class="loading">Gagal memuat detail.<br><small>${err.message}</small></div>`;
  }
}

async function fetchChapterImages(slug) {
  if (!slug) return;
  isReading = true;
  if (currentComicData) saveHistory(currentComicData, slug);

  modalContent.scrollTop = 0;
  modalContent.innerHTML =
    '<div class="loading" style="padding-top:50px;">Memuat Gambar...</div>';

  const modalHeader = document.querySelector(".modal-header");
  if (modalHeader) modalHeader.classList.remove("header-hidden");

  const simpleTitle = slug.split("-").pop();
  modalTitle.innerText = `Ch. ${simpleTitle}`;

  try {
    const res = await fetch(`${BASE_URL}/comic/bacakomik/chapter/${slug}`);
    const json = await res.json();
    const images = json.images;

    if (!images || images.length === 0)
      throw new Error("Gambar tidak ditemukan.");
    if (json.title) modalTitle.innerText = json.title;

    let htmlImages = `<div class="reader-container">`;
    images.forEach((imgUrl) => {
      htmlImages += `<img src="${imgUrl}" class="reader-img chapter-img" loading="lazy" alt="Page">`;
    });

    const nav = json.navigation;
    let prevBtn =
      nav && nav.prev
        ? `<button class="nav-float-btn" onclick="fetchChapterImages('${nav.prev}')"><i class="fa-solid fa-chevron-left"></i> Prev</button>`
        : `<button class="nav-float-btn disabled"><i class="fa-solid fa-chevron-left"></i> Prev</button>`;
    let nextBtn =
      nav && nav.next
        ? `<button class="nav-float-btn" onclick="fetchChapterImages('${nav.next}')">Next <i class="fa-solid fa-chevron-right"></i></button>`
        : `<button class="nav-float-btn disabled">Next <i class="fa-solid fa-chevron-right"></i></button>`;

    htmlImages += `</div><div id="floatingNav" class="reader-nav-floating">${prevBtn}<div class="nav-divider"></div>${nextBtn}</div><div style="height:80px; background:#000;"></div>`;

    modalContent.innerHTML = htmlImages;

    const savedPosition = localStorage.getItem("scroll_" + slug);
    if (savedPosition) {
      setTimeout(() => {
        modalContent.scrollTo({
          top: parseInt(savedPosition),
          behavior: "smooth",
        });
      }, 600);
    }

    const navBar = document.getElementById("floatingNav");
    let isScrolling;
    let saveScrollTimer;

    modalContent.onscroll = () => {
      navBar.classList.add("nav-hidden");
      if (modalHeader) modalHeader.classList.add("header-hidden");

      window.clearTimeout(isScrolling);
      isScrolling = setTimeout(() => {
        navBar.classList.remove("nav-hidden");
        if (modalHeader) modalHeader.classList.remove("header-hidden");
      }, 600);

      window.clearTimeout(saveScrollTimer);
      saveScrollTimer = setTimeout(() => {
        const currentPos = modalContent.scrollTop;
        if (currentPos > 100) {
          localStorage.setItem("scroll_" + slug, currentPos);
        }
      }, 500);
    };
  } catch (err) {
    modalContent.innerHTML = `<div class="loading">Gagal memuat chapter.<br><small>${err.message}</small></div>`;
  }
}

function getSlugFromUrl(url) {
  if (!url) return "";
  const clean = url.replace(/\/$/, "");
  return clean.substring(clean.lastIndexOf("/") + 1);
}

function hideTopSections() {
  if (topContainer) {
    topContainer.style.display = "none";
    if (topContainer.previousElementSibling)
      topContainer.previousElementSibling.style.display = "none";
  }
  if (recommendedContainer) {
    recommendedContainer.style.display = "none";
    if (recommendedContainer.previousElementSibling)
      recommendedContainer.previousElementSibling.style.display = "none";
  }
}
function resetView() {
  switchTab("home");

  if (topContainer) {
    topContainer.style.display = "flex";
    if (topContainer.previousElementSibling)
      topContainer.previousElementSibling.style.display = "block";
  }
  if (recommendedContainer) {
    recommendedContainer.style.display = "flex";
    if (recommendedContainer.previousElementSibling)
      recommendedContainer.previousElementSibling.style.display = "block";
  }
  updateMainHeader(
    '<i class="fa-solid fa-bolt" style="color: #38bdf8;"></i> Update Terbaru'
  );
  currentPage = 1;
  fetchComics(1);
  document
    .querySelectorAll(".genre-item")
    .forEach((el) => el.classList.remove("active"));
}
function updateMainHeader(html) {
  const titleHeader = container.previousElementSibling;
  if (titleHeader && titleHeader.querySelector("h3"))
    titleHeader.querySelector("h3").innerHTML = html;
}

async function initApp() {
  fetchTopComics();
  fetchRecommendedComics();
  fetchGenres();
  fetchComics(1);
}

refreshBtn.addEventListener("click", () => {
  resetView();
  if (searchInput) searchInput.value = "";
});
closeModal.addEventListener("click", () => {
  document.querySelector(".modal-header").classList.remove("header-hidden");
  if (isReading) {
    fetchDetail(currentComicSlug);
  } else {
    modal.classList.remove("active");
    currentComicSlug = "";
    if (historyView.style.display === "block") renderHistoryPage();
    if (favoriteView.style.display === "block") renderFavoritePage();
    setTimeout(() => {
      modalContent.innerHTML = "";
    }, 300);
  }
});

document.addEventListener("DOMContentLoaded", initApp);
