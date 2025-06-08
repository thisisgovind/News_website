const API_KEY = "pub_4b55eb0669b8492cbc75289609de64a3";
const BASE_URL = "https://newsdata.io/api/1/news";

// Valid categories for newsdata.io API
const VALID_CATEGORIES = [
    "business",
    "entertainment",
    "environment",
    "food",
    "health",
    "politics",
    "science",
    "sports",
    "technology",
    "top",
    "world"
];

let currentPage = 1;
let currentQuery = "technology"; // default category
let isLoading = false;
let retryCount = 0;
const MAX_RETRIES = 3;

// Initialize the app
window.addEventListener("load", () => {
    initializeApp();
    highlightCurrentCategory(currentQuery);
});

function initializeApp() {
    // Set initial loading state
    const cardsContainer = document.getElementById("cardscontainer");
    cardsContainer.innerHTML = '<div class="loading">Loading news...</div>';
    
    // Initial news fetch
    fetchNews(currentQuery)
        .catch(error => {
            console.error("Failed to load initial news:", error);
            showError("Failed to load news. Please try again later.");
        });
}

async function fetchNews(category = "technology", page = 1) {
    if (isLoading) return;
    isLoading = true;
    retryCount = 0;

    const cardsContainer = document.getElementById("cardscontainer");

    try {
        // Validate category
        if (!VALID_CATEGORIES.includes(category)) {
            category = "technology"; // fallback to default if invalid
            console.warn(`Invalid category: ${category}, falling back to technology`);
        }

        const url = `${BASE_URL}?apikey=${API_KEY}&language=en&category=${category}${page > 1 ? `&page=${page}` : ''}`;
        
        const res = await fetchWithRetry(url);

        if (!res.ok) {
            handleHttpError(res.status);
            return;
        }

        const data = await res.json();

        if (!data.results || !Array.isArray(data.results)) {
            throw new Error("Invalid response format from NewsAPI.");
        }

        if (data.results.length === 0) {
            if (page === 1) {
                cardsContainer.innerHTML = '<div class="no-results">No news articles found.</div>';
            }
            return;
        }

        bindData(data.results, page === 1);
        
        if (data.nextPage) {
            currentPage = data.nextPage;
        }
    } catch (error) {
        handleError(error, category, page);
    } finally {
        isLoading = false;
    }
}

async function fetchNewsBySearch(query, page = 1) {
    if (isLoading) return;
    isLoading = true;
    retryCount = 0;

    const cardsContainer = document.getElementById("cardscontainer");

    try {
        if (!query.trim()) {
            throw new Error("Please enter a search term");
        }

        const url = `${BASE_URL}?apikey=${API_KEY}&language=en&q=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`;
        
        const res = await fetchWithRetry(url);

        if (!res.ok) {
            handleHttpError(res.status);
            return;
        }

        const data = await res.json();

        if (!data.results || !Array.isArray(data.results)) {
            throw new Error("Invalid response format from NewsAPI.");
        }

        if (data.results.length === 0) {
            if (page === 1) {
                cardsContainer.innerHTML = '<div class="no-results">No results found for your search.</div>';
            }
            return;
        }

        bindData(data.results, page === 1);
        
        if (data.nextPage) {
            currentPage = data.nextPage;
        }
    } catch (error) {
        handleError(error, null, page, query);
    } finally {
        isLoading = false;
    }
}

async function fetchWithRetry(url, retries = 3) {
    try {
        return await fetch(url);
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            return fetchWithRetry(url, retries - 1);
        }
        throw error;
    }
}

function handleHttpError(status) {
    let message;
    switch (status) {
        case 429:
            message = "Too many requests. Please wait a moment and try again.";
            break;
        case 401:
            message = "API key is invalid or expired.";
            break;
        case 422:
            message = "Invalid request parameters.";
            break;
          default:
            message = `Server error (${status}). Please try again later.`;
    }
    showError(message);
}

function handleError(error, category = null, page = 1, query = null) {
    console.error("Error:", error);
    if (page === 1) {
        const retryFunction = category ? 
            () => retryFetch(category, page) : 
            () => retrySearch(query, page);
        
        showError(error.message, retryFunction);
    }
}

function showError(message, retryFunction = null) {
    const cardsContainer = document.getElementById("cardscontainer");
    cardsContainer.innerHTML = `
        <div class="error-container">
            <p class="error-message">${message}</p>
            ${retryFunction ? `
                <button onclick="handleRetry()" class="retry-button">
                    Try Again
                </button>
            ` : ''}
        </div>
    `;
    window.handleRetry = retryFunction; // Make retry function globally available
}

function bindData(articles, clearOld = false) {
    const cardsContainer = document.getElementById("cardscontainer");
    const newsCardTemplate = document.getElementById("template-news-card");

    if (!newsCardTemplate) {
        console.error("News card template not found");
        return;
    }

    if (clearOld) {
        cardsContainer.innerHTML = "";
    }

    articles.forEach(article => {
        if (!isValidArticle(article)) return;

        try {
            const cardClone = newsCardTemplate.content.cloneNode(true);
            fillDataInCard(cardClone, article);
            cardsContainer.appendChild(cardClone);
        } catch (error) {
            console.error("Error creating news card:", error);
        }
    });
}

function isValidArticle(article) {
    return article && article.image_url && article.title && article.link;
}

function fillDataInCard(cardClone, article) {
    try {
        const newsImg = cardClone.querySelector("#news-img");
        const newsTitle = cardClone.querySelector("#news-title");
        const newsSource = cardClone.querySelector("#news-source");
        const newsDesc = cardClone.querySelector("#news-desc");

        if (!newsImg || !newsTitle || !newsSource || !newsDesc) {
            throw new Error("Required elements not found in template");
        }

        newsImg.src = article.image_url;
        newsImg.alt = article.title;
        newsImg.onerror = () => {
            newsImg.src = 'https://via.placeholder.com/400x200?text=News+Image';
        };

        newsTitle.innerHTML = article.title.length > 60 ? 
            `${article.title.slice(0, 60)}...` : article.title;
        newsDesc.innerHTML = article.description ? 
            `${article.description.slice(0, 150)}...` : '';

        const date = new Date(article.pubDate).toLocaleString("en-US", {
            timeZone: "UTC",
            dateStyle: "medium",
            timeStyle: "short"
        });

        newsSource.innerHTML = `${article.source_id || 'Unknown'} · ${date}`;

        const card = cardClone.firstElementChild;
        if (card) {
            card.addEventListener("click", () => {
                window.open(article.link, "_blank", "noopener noreferrer");
            });
        }
    } catch (error) {
        console.error("Error filling card data:", error);
        throw error;
    }
}

function highlightCurrentCategory(id) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    const currentItem = document.getElementById(id);
    if (currentItem) {
        currentItem.classList.add('active');
        curSelectedNav = currentItem;
    }
}

let curSelectedNav = null;
function onNavItemClick(id) {
    if (!id || isLoading) return;
    
    currentQuery = id;
    currentPage = 1;
    highlightCurrentCategory(id);
    fetchNews(currentQuery, currentPage);
}

// Initialize search functionality
const searchButton = document.getElementById("search-button");
const searchText = document.getElementById("search-text");

if (searchButton && searchText) {
    searchButton.addEventListener("click", handleSearch);
    searchText.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    });
}

function handleSearch() {
    const query = searchText?.value.trim();
    if (!query) return;

    currentQuery = query;
    currentPage = 1;
    curSelectedNav?.classList.remove("active");
    curSelectedNav = null;
    fetchNewsBySearch(currentQuery, currentPage);
}

// Implement infinite scrolling with debounce
let scrollTimeout;
window.addEventListener("scroll", () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            if (!isLoading && currentPage) {
                if (curSelectedNav) {
                    fetchNews(currentQuery, currentPage);
                } else {
                    fetchNewsBySearch(currentQuery, currentPage);
                }
            }
        }
    }, 100); // Debounce scroll events
});
