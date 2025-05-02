// DOM Elements
const addBookmarkBtn = document.getElementById('add-bookmark-btn');
const exportBtn = document.getElementById('export-btn');
const exportFormatBtn = document.getElementById('export-format-btn');
const selectedFormat = document.getElementById('selected-format');
const formatOptions = document.querySelectorAll('.dropdown-content a');
const searchInput = document.getElementById('search-input');
const tagFilter = document.getElementById('tag-filter');
const bookmarksList = document.getElementById('bookmarks-list');
const noBookmarksMessage = document.getElementById('no-bookmarks-message');
const modal = document.getElementById('add-bookmark-modal');
const modalTitle = document.getElementById('modal-title');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.querySelector('.cancel-btn');
const bookmarkForm = document.getElementById('bookmark-form');
const editIdInput = document.getElementById('edit-id');
const titleInput = document.getElementById('title');
const urlInput = document.getElementById('url');
const notesInput = document.getElementById('notes');
const tagsInput = document.getElementById('tags');
const themeToggle = document.getElementById('theme-toggle');

// Define export format
let currentExportFormat = 'html';

class BookmarkManager {
    constructor() {
        this.bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
        this.init();
        this.initTheme();
    }

    init() {
        addBookmarkBtn.addEventListener('click', () => this.openModal());
        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());
        bookmarkForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        exportBtn.addEventListener('click', () => this.exportBookmarks());
        searchInput.addEventListener('input', () => this.filterBookmarks());
        tagFilter.addEventListener('change', () => this.filterBookmarks());
        themeToggle.addEventListener('click', () => this.toggleTheme());

        const actionsDiv = document.querySelector('.actions');
        const importBtn = document.createElement('button');
        importBtn.id = 'import-btn';
        importBtn.className = 'btn primary-btn';
        importBtn.innerHTML = '<i class="fas fa-file-import"></i> Import Bookmarks';
        importBtn.addEventListener('click', () => this.importBookmarks());

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'import-file';
        fileInput.accept = '.json,.html,.txt';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => this.handleFileImport(e));

        actionsDiv.insertBefore(importBtn, document.querySelector('.export-options'));
        document.body.appendChild(fileInput);

        formatOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                currentExportFormat = e.target.getAttribute('data-format');
                selectedFormat.textContent = e.target.textContent;
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        this.displayBookmarks();
        this.updateTagFilter();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');

        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    importBookmarks() {
        document.getElementById('import-file').click();
    }

    handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const fileExtension = file.name.split('.').pop().toLowerCase();
                let importedBookmarks = [];

                if (fileExtension === 'json') {
                    importedBookmarks = this.parseJsonBookmarks(event.target.result);
                } else if (fileExtension === 'html') {
                    importedBookmarks = this.parseHtmlBookmarks(event.target.result);
                } else if (fileExtension === 'txt') {
                    importedBookmarks = this.parseTxtBookmarks(event.target.result);
                }

                if (importedBookmarks.length > 0) {
                    const existingUrls = this.bookmarks.map(b => b.url);
                    const newBookmarks = importedBookmarks.filter(b => !existingUrls.includes(b.url));

                    if (newBookmarks.length > 0) {
                        this.bookmarks = [...this.bookmarks, ...newBookmarks];
                        this.saveBookmarks();
                        this.displayBookmarks();
                        this.updateTagFilter();
                        alert(`Successfully imported ${newBookmarks.length} new bookmarks.`);
                    } else {
                        alert('No new bookmarks found to import.');
                    }
                } else {
                    alert('No valid bookmarks found in the imported file.');
                }
            } catch (error) {
                console.error('Error importing bookmarks:', error);
                alert('Error importing bookmarks. Please check the file format.');
            }

            e.target.value = '';
        };

        reader.readAsText(file);
    }

    parseJsonBookmarks(content) {
        try {
            const bookmarks = JSON.parse(content);

            if (Array.isArray(bookmarks) && bookmarks.length > 0 && bookmarks[0].url) {
                return bookmarks.map(bookmark => {
                    return {
                        id: bookmark.id || this.generateId(),
                        title: bookmark.title || 'Untitled',
                        url: bookmark.url,
                        notes: bookmark.notes || '',
                        tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
                        dateAdded: bookmark.dateAdded || new Date().toISOString()
                    };
                });
            }

            return [];
        } catch (error) {
            console.error('Error parsing JSON bookmarks:', error);
            return [];
        }
    }

    parseHtmlBookmarks(content) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const bookmarkElements = doc.querySelectorAll('.bookmark');
            const bookmarks = [];

            bookmarkElements.forEach(el => {
                const title = el.querySelector('.bookmark-title')?.textContent || 'Untitled';
                const url = el.querySelector('.bookmark-url')?.getAttribute('href');

                if (url) {
                    const notesEl = el.querySelector('.bookmark-notes');
                    const notes = notesEl ? notesEl.textContent : '';

                    const tagsEl = el.querySelectorAll('.tag');
                    const tags = Array.from(tagsEl).map(tag => tag.textContent);

                    bookmarks.push({
                        id: this.generateId(),
                        title,
                        url,
                        notes,
                        tags,
                        dateAdded: new Date().toISOString()
                    });
                }
            });

            return bookmarks;
        } catch (error) {
            console.error('Error parsing HTML bookmarks:', error);
            return [];
        }
    }

    parseTxtBookmarks(content) {
        try {
            const lines = content.split('\n');
            const bookmarks = [];
            let currentBookmark = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.startsWith('URL:')) {
                    if (currentBookmark && currentBookmark.url) {
                        bookmarks.push(currentBookmark);
                    }

                    const url = line.substring(4).trim();
                    if (url) {
                        currentBookmark = {
                            id: this.generateId(),
                            title: 'Untitled',
                            url,
                            notes: '',
                            tags: [],
                            dateAdded: new Date().toISOString()
                        };
                    }
                } else if (currentBookmark) {
                    if (line.startsWith('Tags:')) {
                        const tagStr = line.substring(5).trim();
                        currentBookmark.tags = tagStr.split(',').map(t => t.trim()).filter(t => t);
                    } else if (line.startsWith('Notes:')) {
                        currentBookmark.notes = line.substring(6).trim();
                    } else if (line.length > 0 && !line.includes('-'.repeat(10)) && !currentBookmark.title || currentBookmark.title === 'Untitled') {
                        currentBookmark.title = line;
                    }
                }
            }

            if (currentBookmark && currentBookmark.url) {
                bookmarks.push(currentBookmark);
            }

            return bookmarks;
        } catch (error) {
            console.error('Error parsing TXT bookmarks:', error);
            return [];
        }
    }

    displayBookmarks(filteredBookmarks = null) {
        const bookmarksToDisplay = filteredBookmarks || this.bookmarks;

        bookmarksList.innerHTML = '';

        if (bookmarksToDisplay.length === 0) {
            bookmarksList.innerHTML = '';
            noBookmarksMessage.classList.remove('hidden');
            return;
        }

        noBookmarksMessage.classList.add('hidden');

        bookmarksToDisplay.forEach(bookmark => {
            const row = document.createElement('tr');

            const formattedDate = new Date(bookmark.dateAdded).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const tagsHtml = bookmark.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');

            row.innerHTML = `
                <td data-label="Title">${bookmark.title}</td>
                <td data-label="URL">
                    <a href="${bookmark.url}" target="_blank" title="${bookmark.url}">${this.truncateText(bookmark.url, 30)}</a>
                </td>
                <td data-label="Date Added">${formattedDate}</td>
                <td data-label="Notes">${bookmark.notes || '-'}</td>
                <td data-label="Tags">${tagsHtml || '-'}</td>
                <td data-label="Actions" class="actions-cell">
                    <button class="action-btn visit-btn" title="Visit" data-id="${bookmark.id}">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="action-btn edit-btn" title="Edit" data-id="${bookmark.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete" data-id="${bookmark.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;

            bookmarksList.appendChild(row);
        });

        document.querySelectorAll('.visit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const bookmark = this.getBookmarkById(id);
                window.open(bookmark.url, '_blank');
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.editBookmark(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.deleteBookmark(id);
            });
        });
    }

    handleFormSubmit(e) {
        e.preventDefault();

        const id = editIdInput.value || this.generateId();
        const title = titleInput.value.trim();
        const url = this.formatUrl(urlInput.value.trim());
        const notes = notesInput.value.trim();
        const tags = tagsInput.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== '');

        const bookmark = {
            id,
            title,
            url,
            notes,
            tags,
            dateAdded: editIdInput.value ? this.getBookmarkById(id).dateAdded : new Date().toISOString()
        };

        if (editIdInput.value) {
            const index = this.bookmarks.findIndex(b => b.id === id);
            this.bookmarks[index] = bookmark;
        } else {
            this.bookmarks.push(bookmark);
        }

        this.saveBookmarks();
        this.closeModal();
        this.displayBookmarks();
        this.updateTagFilter();
    }

    openModal(bookmark = null) {
        modalTitle.textContent = bookmark ? 'Edit Bookmark' : 'Add Bookmark';

        if (bookmark) {
            editIdInput.value = bookmark.id;
            titleInput.value = bookmark.title;
            urlInput.value = bookmark.url;
            notesInput.value = bookmark.notes || '';
            tagsInput.value = bookmark.tags.join(', ');
        } else {
            bookmarkForm.reset();
            editIdInput.value = '';
        }

        modal.style.display = 'block';
    }

    closeModal() {
        modal.style.display = 'none';
        bookmarkForm.reset();
    }

    editBookmark(id) {
        const bookmark = this.getBookmarkById(id);
        this.openModal(bookmark);
    }

    deleteBookmark(id) {
        if (confirm('Are you sure you want to delete this bookmark?')) {
            this.bookmarks = this.bookmarks.filter(bookmark => bookmark.id !== id);
            this.saveBookmarks();
            this.displayBookmarks();
            this.updateTagFilter();
        }
    }

    filterBookmarks() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedTag = tagFilter.value;

        const filteredBookmarks = this.bookmarks.filter(bookmark => {
            const matchesSearch =
                bookmark.title.toLowerCase().includes(searchTerm) ||
                bookmark.url.toLowerCase().includes(searchTerm) ||
                bookmark.notes.toLowerCase().includes(searchTerm) ||
                bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm));

            const matchesTag =
                !selectedTag ||
                bookmark.tags.includes(selectedTag);

            return matchesSearch && matchesTag;
        });

        this.displayBookmarks(filteredBookmarks);
    }

    updateTagFilter() {
        const allTags = [...new Set(this.bookmarks.flatMap(bookmark => bookmark.tags))];

        const currentSelection = tagFilter.value;

        while (tagFilter.options.length > 1) {
            tagFilter.remove(1);
        }

        allTags.sort().forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });

        if (currentSelection && allTags.includes(currentSelection)) {
            tagFilter.value = currentSelection;
        }
    }

    exportBookmarks() {
        if (this.bookmarks.length === 0) {
            alert('No bookmarks to export');
            return;
        }

        switch(currentExportFormat) {
            case 'html':
                this.exportAsHTML();
                break;
            case 'txt':
                this.exportAsTXT();
                break;
            case 'pdf':
                this.exportAsPDF();
                break;
            default:
                this.exportAsHTML();
        }
    }

    exportAsHTML() {
        let exportContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Exported Bookmarks</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                    color: #333;
                }
                h1 {
                    color: #3498db;
                    text-align: center;
                    margin-bottom: 30px;
                }
                .bookmark {
                    background-color: #f9f9f9;
                    border-left: 4px solid #3498db;
                    padding: 15px;
                    margin-bottom: 20px;
                    border-radius: 4px;
                }
                .bookmark-title {
                    font-size: 1.2rem;
                    margin-bottom: 5px;
                    color: #2c3e50;
                }
                .bookmark-url {
                    display: block;
                    color: #3498db;
                    margin-bottom: 10px;
                    word-break: break-all;
                }
                .bookmark-date {
                    font-size: 0.9rem;
                    color: #7f8c8d;
                    margin-bottom: 5px;
                }
                .bookmark-notes {
                    background-color: #fff;
                    padding: 10px;
                    border-radius: 4px;
                    border: 1px solid #ddd;
                    margin: 10px 0;
                }
                .bookmark-tags {
                    margin-top: 10px;
                }
                .tag {
                    display: inline-block;
                    background-color: #3498db;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    margin-right: 5px;
                }
                .export-info {
                    text-align: center;
                    font-style: italic;
                    color: #7f8c8d;
                    margin-top: 40px;
                    font-size: 0.9rem;
                }
            </style>
        </head>
        <body>
            <h1>Exported Bookmarks</h1>`;

        this.bookmarks.forEach(bookmark => {
            const formattedDate = new Date(bookmark.dateAdded).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const tagsHtml = bookmark.tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');

            exportContent += `
            <div class="bookmark">
                <h2 class="bookmark-title">${bookmark.title}</h2>
                <a href="${bookmark.url}" class="bookmark-url" target="_blank">${bookmark.url}</a>
                <div class="bookmark-date">Added on ${formattedDate}</div>
                ${bookmark.notes ? `<div class="bookmark-notes">${bookmark.notes}</div>` : ''}
                ${tagsHtml ? `<div class="bookmark-tags">Tags: ${tagsHtml}</div>` : ''}
            </div>`;
        });

        const date = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });

        exportContent += `
            <div class="export-info">
                Exported from Bookmark Manager on ${date}
            </div>
        </body>
        </html>`;

        const blob = new Blob([exportContent], { type: 'text/html' });
        this.downloadFile(blob, 'bookmarks-export', 'html');
    }

    exportAsTXT() {
        let exportContent = `EXPORTED BOOKMARKS\n`;
        exportContent += `Generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}\n\n`;

        this.bookmarks.forEach((bookmark, index) => {
            exportContent += `${index + 1}. ${bookmark.title}\n`;
            exportContent += `URL: ${bookmark.url}\n`;
            exportContent += `Date Added: ${new Date(bookmark.dateAdded).toLocaleDateString()}\n`;

            if (bookmark.notes) {
                exportContent += `Notes: ${bookmark.notes}\n`;
            }

            if (bookmark.tags.length > 0) {
                exportContent += `Tags: ${bookmark.tags.join(', ')}\n`;
            }

            exportContent += `\n${'-'.repeat(50)}\n\n`;
        });

        const blob = new Blob([exportContent], { type: 'text/plain' });
        this.downloadFile(blob, 'bookmarks-export', 'txt');
    }

    exportAsPDF() {
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
            alert("PDF library not loaded. Downloading as HTML instead.");
            this.exportAsHTML();
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(20);
            doc.setTextColor(52, 152, 219);
            doc.text('Bookmark Manager - Exported Bookmarks', 105, 20, { align: 'center' });

            const exportDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric'
            });
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Exported on ${exportDate}`, 105, 30, { align: 'center' });

            const data = this.bookmarks.map(bookmark => {
                const date = new Date(bookmark.dateAdded).toLocaleDateString();
                const tags = bookmark.tags.join(', ');
                const notes = bookmark.notes ? 
                    (bookmark.notes.length > 30 ? bookmark.notes.substring(0, 30) + '...' : bookmark.notes) : 
                    '';
                
                return [
                    bookmark.title, 
                    bookmark.url, 
                    date,
                    notes,
                    tags
                ];
            });

            doc.autoTable({
                startY: 40,
                head: [['Title', 'URL', 'Date Added', 'Notes', 'Tags']],
                body: data,
                headStyles: {
                    fillColor: [52, 152, 219],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 'auto' },
                    4: { cellWidth: 30 }
                },
                margin: { top: 40 },
                styles: { 
                    overflow: 'ellipsize',
                    cellPadding: 3
                },
                didDrawPage: (data) => {
                    doc.setFontSize(10);
                    doc.text(
                        `Page ${doc.internal.getNumberOfPages()}`, 
                        data.settings.margin.left, 
                        doc.internal.pageSize.height - 10
                    );
                }
            });

            if (this.bookmarks.length > 0) {
                doc.addPage();
                doc.setFontSize(16);
                doc.setTextColor(52, 152, 219);
                doc.text('Detailed Bookmark Information', 105, 20, { align: 'center' });
                
                let yPos = 40;
                const pageHeight = doc.internal.pageSize.height;
                
                this.bookmarks.forEach((bookmark, index) => {
                    if (yPos > pageHeight - 60) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    const contentHeight = 100;
                    
                    if (yPos + contentHeight > pageHeight - 20) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    const formattedDate = new Date(bookmark.dateAdded).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    doc.setFontSize(14);
                    doc.setTextColor(44, 62, 80);
                    doc.text(`${index + 1}. ${bookmark.title}`, 20, yPos);
                    yPos += 10;
                    
                    doc.setFontSize(12);
                    doc.setTextColor(52, 152, 219);
                    doc.text(`URL: ${bookmark.url}`, 20, yPos);
                    yPos += 10;
                    
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Added on: ${formattedDate}`, 20, yPos);
                    yPos += 10;
                    
                    if (bookmark.notes) {
                        doc.setTextColor(44, 62, 80);
                        doc.text('Notes:', 20, yPos);
                        yPos += 8;
                        
                        const noteLines = doc.splitTextToSize(bookmark.notes, 170);
                        doc.setTextColor(80, 80, 80);
                        doc.text(noteLines, 25, yPos);
                        yPos += (noteLines.length * 6) + 5;
                    }
                    
                    if (bookmark.tags.length > 0) {
                        doc.setTextColor(44, 62, 80);
                        doc.text(`Tags: ${bookmark.tags.join(', ')}`, 20, yPos);
                        yPos += 10;
                    }
                    
                    doc.setDrawColor(220, 220, 220);
                    doc.line(20, yPos, 190, yPos);
                    yPos += 20;
                });
            }
            
            const fileName = `bookmarks-export-${new Date().toISOString().split('T')[0]}.pdf`;
            
            doc.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('There was an error generating the PDF. Downloading as HTML instead.');
            this.exportAsHTML();
        }
    }

    downloadFile(blob, filename, extension) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const exportDate = new Date().toISOString().split('T')[0];
        a.download = `${filename}-${exportDate}.${extension}`;

        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    getBookmarkById(id) {
        return this.bookmarks.find(bookmark => bookmark.id === id);
    }

    saveBookmarks() {
        localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    formatUrl(url) {
        if (!url.match(/^https?:\/\//i)) {
            return 'https://' + url;
        }
        return url;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BookmarkManager();
});