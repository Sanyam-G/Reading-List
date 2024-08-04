document.addEventListener('DOMContentLoaded', () => {
    const newBookButton = document.getElementById('newBookButton');
    const bookFormModal = document.getElementById('bookFormModal');
    const closeModal = document.querySelector('.close');
    const bookForm = document.getElementById('bookForm');
    const titleInput = document.getElementById('title');
    const authorInput = document.getElementById('author');
    const publishedDateInput = document.getElementById('publishedDate');
    const coverImageInput = document.getElementById('coverImage');
    const coverPreview = document.getElementById('coverPreview');
    const totalPagesInput = document.getElementById('totalPages');
    const currentPageInput = document.getElementById('currentPage');
    const statusInput = document.getElementById('status');
    const suggestionsContainer = document.getElementById('suggestions');
    const searchInput = document.getElementById('search');
    const readingList = document.getElementById('readingList');
    const completedList = document.getElementById('completedList');
    const onHoldList = document.getElementById('onHoldList');
    const readingTab = document.getElementById('readingTab');
    const completedTab = document.getElementById('completedTab');
    const onHoldTab = document.getElementById('onHoldTab');
    const exportButton = document.getElementById('exportButton');
    const importButton = document.getElementById('importButton');
    const importFileInput = document.getElementById('importFile');
    const incrementPageButton = document.getElementById('incrementPage');
    const decrementPageButton = document.getElementById('decrementPage');

    let editingIndex = -1;

    newBookButton.addEventListener('click', () => {
        bookFormModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        bookFormModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === bookFormModal) {
            bookFormModal.style.display = 'none';
        }
    });

    bookForm.addEventListener('submit', saveBook);
    titleInput.addEventListener('input', fetchBookSuggestions);
    searchInput.addEventListener('input', searchBooks);
    coverImageInput.addEventListener('input', updateCoverPreview);
    exportButton.addEventListener('click', exportData);
    importButton.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);
    incrementPageButton.addEventListener('click', incrementPage);
    decrementPageButton.addEventListener('click', decrementPage);

    readingTab.addEventListener('click', () => showTab('reading'));
    completedTab.addEventListener('click', () => showTab('completed'));
    onHoldTab.addEventListener('click', () => showTab('on-hold'));

    function getBooks() {
        return JSON.parse(localStorage.getItem('books')) || [];
    }

    function saveBooks(books) {
        localStorage.setItem('books', JSON.stringify(books));
    }

    async function fetchBookSuggestions() {
        const query = titleInput.value;
        if (query.length < 3) {
            suggestionsContainer.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`https://openlibrary.org/search.json?q=${query}&fields=title,author_name,first_publish_year,cover_i,number_of_pages_median,key`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            displaySuggestions(data.docs);
        } catch (error) {
            console.error('Failed to fetch book suggestions:', error);
        }
    }

    function displaySuggestions(books) {
        suggestionsContainer.innerHTML = '';
        if (!books || books.length === 0) {
            return;
        }
        books.forEach(book => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = book.title;
            suggestionItem.addEventListener('click', () => selectBook(book));
            suggestionsContainer.appendChild(suggestionItem);
        });
    }

    function selectBook(book) {
        titleInput.value = book.title;
        authorInput.value = book.author_name ? book.author_name.join(', ') : '';
        publishedDateInput.value = book.first_publish_year || '';
        coverImageInput.value = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : '';
        totalPagesInput.value = book.number_of_pages_median || '';
        updateCoverPreview();
        suggestionsContainer.innerHTML = '';
    }

    function saveBook(e) {
        e.preventDefault();
        const title = titleInput.value;
        const author = authorInput.value;
        const publishedDate = publishedDateInput.value;
        const coverImage = coverImageInput.value;
        const totalPages = totalPagesInput.value;
        const currentPage = currentPageInput.value;
        let status = statusInput.value;
        const books = getBooks();

        if (parseInt(currentPage) >= parseInt(totalPages)) {
            status = 'completed';
        }

        if (editingIndex > -1) {
            books[editingIndex] = { title, author, publishedDate, coverImage, totalPages, currentPage, status };
            editingIndex = -1;
        } else {
            books.push({ title, author, publishedDate, coverImage, totalPages, currentPage, status });
        }

        saveBooks(books);
        displayBooks();
        bookForm.reset();
        coverPreview.src = 'placeholder.png';
        bookFormModal.style.display = 'none';
    }

    function displayBooks() {
        const books = getBooks();
        readingList.innerHTML = '';
        completedList.innerHTML = '';
        onHoldList.innerHTML = '';
        books.forEach((book, index) => {
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';
            bookItem.innerHTML = `
                <img src="${book.coverImage || 'placeholder.png'}" alt="Cover" class="book-cover">
                <div class="book-info">
                    <strong>${book.title}</strong> by ${book.author}
                    <div class="page-control">
                        <button class="page-control-button" data-index="${index}" data-action="decrement"><i class="fas fa-minus"></i></button> 
                        ${book.currentPage}/${book.totalPages} 
                        <button class="page-control-button" data-index="${index}" data-action="increment"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                <div class="book-actions">
                    <button class="edit-button" data-index="${index}"><i class="fas fa-edit"></i></button>
                    <button class="delete-button" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
                <div class="published-date">Published: ${book.publishedDate}</div>
            `;
            if (book.status === 'reading') {
                readingList.appendChild(bookItem);
            } else if (book.status === 'completed') {
                completedList.appendChild(bookItem);
            } else if (book.status === 'on-hold') {
                onHoldList.appendChild(bookItem);
            }

            const editButton = bookItem.querySelector('.edit-button');
            editButton.addEventListener('click', () => editBook(index));

            const deleteButton = bookItem.querySelector('.delete-button');
            deleteButton.addEventListener('click', () => deleteBook(index));

            const pageControlButtons = bookItem.querySelectorAll('.page-control-button');
            pageControlButtons.forEach(button => button.addEventListener('click', handlePageControl));
        });
    }

    function editBook(index) {
        const books = getBooks();
        const book = books[index];
        titleInput.value = book.title;
        authorInput.value = book.author;
        publishedDateInput.value = book.publishedDate;
        coverImageInput.value = book.coverImage;
        totalPagesInput.value = book.totalPages;
        currentPageInput.value = book.currentPage;
        statusInput.value = book.status;
        coverPreview.src = book.coverImage || 'placeholder.png';
        bookFormModal.style.display = 'block';
        editingIndex = index;
    }

    function deleteBook(index) {
        const books = getBooks();
        books.splice(index, 1);
        saveBooks(books);
        displayBooks();
    }

    function searchBooks() {
        const query = searchInput.value.toLowerCase();
        const books = getBooks();
        readingList.innerHTML = '';
        completedList.innerHTML = '';
        onHoldList.innerHTML = '';
        books.filter(book => book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query)).forEach((book, index) => {
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';
            bookItem.innerHTML = `
                <img src="${book.coverImage || 'placeholder.png'}" alt="Cover" class="book-cover">
                <div class="book-info">
                    <strong>${book.title}</strong> by ${book.author}
                    <div class="page-control">
                        <button class="page-control-button" data-index="${index}" data-action="decrement"><i class="fas fa-minus"></i></button> 
                        ${book.currentPage}/${book.totalPages} 
                        <button class="page-control-button" data-index="${index}" data-action="increment"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                <div class="book-actions">
                    <button class="edit-button" data-index="${index}"><i class="fas fa-edit"></i></button>
                    <button class="delete-button" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
                <div class="published-date">Published: ${book.publishedDate}</div>
            `;
            if (book.status === 'reading') {
                readingList.appendChild(bookItem);
            } else if (book.status === 'completed') {
                completedList.appendChild(bookItem);
            } else if (book.status === 'on-hold') {
                onHoldList.appendChild(bookItem);
            }

            const editButton = bookItem.querySelector('.edit-button');
            editButton.addEventListener('click', () => editBook(index));

            const deleteButton = bookItem.querySelector('.delete-button');
            deleteButton.addEventListener('click', () => deleteBook(index));

            const pageControlButtons = bookItem.querySelectorAll('.page-control-button');
            pageControlButtons.forEach(button => button.addEventListener('click', handlePageControl));
        });
    }

    function handlePageControl(event) {
        const index = event.target.closest('.page-control-button').dataset.index;
        const action = event.target.closest('.page-control-button').dataset.action;
        const books = getBooks();
        let book = books[index];

        if (action === 'increment' && book.currentPage < book.totalPages) {
            book.currentPage++;
        } else if (action === 'decrement' && book.currentPage > 0) {
            book.currentPage--;
        }

        if (book.currentPage >= book.totalPages) {
            book.status = 'completed';
        }

        books[index] = book;
        saveBooks(books);
        displayBooks();
    }

    function updateCoverPreview() {
        coverPreview.src = coverImageInput.value || 'placeholder.png';
    }

    function showTab(tab) {
        readingList.style.display = 'none';
        completedList.style.display = 'none';
        onHoldList.style.display = 'none';

        if (tab === 'reading') {
            readingList.style.display = 'block';
        } else if (tab === 'completed') {
            completedList.style.display = 'block';
        } else if (tab === 'on-hold') {
            onHoldList.style.display = 'block';
        }
    }

    function exportData() {
        const books = getBooks();
        const dataStr = JSON.stringify(books, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'books.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const books = JSON.parse(content);
            saveBooks(books);
            displayBooks();
        };
        reader.readAsText(file);
    }

    function incrementPage() {
        currentPageInput.value = parseInt(currentPageInput.value) + 1;
        if (parseInt(currentPageInput.value) >= parseInt(totalPagesInput.value)) {
            statusInput.value = 'completed';
        }
    }

    function decrementPage() {
        if (parseInt(currentPageInput.value) > 0) {
            currentPageInput.value = parseInt(currentPageInput.value) - 1;
        }
    }

    displayBooks();
    showTab('reading');
});
