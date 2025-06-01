const API_KEY = "0ea2bdb2e0714ed0a010339f866ae4b0"; 
const BASE_URL = "https://newsapi.org/v2/everything?q=";

let currentPage = 1;
let currentQuery = "Technology";
let isLoading = false;

window.addEventListener("load", () => fetchNews(currentQuery));

async function fetchNews(query, page = 1) {
    if (isLoading) return;
    isLoading = true;

    const cardsContainer = document.getElementById("cardscontainer");

    try {
        const res = await fetch(`${BASE_URL}${encodeURIComponent(query)}&apiKey=${API_KEY}&page=${page}&pageSize=10`);

        if (!res.ok) {
            if (res.status === 429) {
                throw new Error("Rate limit exceeded. Please wait and try again later.");
            } else if (res.status === 401) {
                throw new Error("Invalid API key. Check your NewsAPI key.");
            } else {
                throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
            }
        }

        const data = await res.json();

        if (!data.articles || !Array.isArray(data.articles)) {
            throw new Error("Invalid response format from NewsAPI.");
        }

        bindData(data.articles, page === 1);
    } catch (error) {
        console.error("Fetch error:", error.message);
        if (page === 1) {
            cardsContainer.innerHTML = `<p style="color:red; font-weight:bold;">${error.message}</p>`;
        }
    } finally {
        isLoading = false;
    }
}

function bindData(articles, clearOld = false) {
    const cardsContainer = document.getElementById("cardscontainer");
    const newsCardTemplate = document.getElementById("template-news-card");

    if (clearOld) cardsContainer.innerHTML = "";

    articles.forEach(article => {
        if (!article.urlToImage || !article.title || !article.url) return;

        const cardClone = newsCardTemplate.content.cloneNode(true);
        fillDataInCard(cardClone, article);
        cardsContainer.appendChild(cardClone);
    });
}

function fillDataInCard(cardClone, article) {
    const newsImg = cardClone.querySelector("#news-img");
    const newsTitle = cardClone.querySelector("#news-title");
    const newsSource = cardClone.querySelector("#news-source");
    const newsDesc = cardClone.querySelector("#news-desc");

    newsImg.src = article.urlToImage;
    newsTitle.innerHTML = `${article.title.slice(0, 60)}...`;
    newsDesc.innerHTML = `${article.description?.slice(0, 150) || ''}...`;

    const date = new Date(article.publishedAt).toLocaleString("en-US", {
        timeZone: "Asia/Jakarta"
    });

    newsSource.innerHTML = `${article.source?.name || 'Unknown'} · ${date}`;

    cardClone.firstElementChild.addEventListener("click", () => {
        window.open(article.url, "_blank");
    });
}

let curSelectedNav = null;

function onNavItemClick(id) {
    currentQuery = id;
    currentPage = 1;
    fetchNews(currentQuery, currentPage);

    const navItem = document.getElementById(id);
    curSelectedNav?.classList.remove("active");
    curSelectedNav = navItem;
    curSelectedNav.classList.add("active");
}

const searchButton = document.getElementById("search-button");
const searchText = document.getElementById("search-text");

searchButton.addEventListener("click", () => {
    const query = searchText.value.trim();
    if (!query) return;
    currentQuery = query;
    currentPage = 1;
    fetchNews(currentQuery, currentPage);
    curSelectedNav?.classList.remove("active");
    curSelectedNav = null;
});

// Infinite Scrolling with delay and loading protection
window.addEventListener("scroll", () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        if (!isLoading) {
            isLoading = true;
            setTimeout(() => {
                currentPage++;
                fetchNews(currentQuery, currentPage);
            }, 1000); // 1s delay to prevent flooding API
        }
    }
});
