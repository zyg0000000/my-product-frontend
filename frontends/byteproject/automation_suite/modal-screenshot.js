/**
 * @file modal-screenshot.js
 * @description 截图查看弹窗模块
 */

export default class ScreenshotModal {
    constructor(app) {
        this.app = app;
        this.screenshots = [];
        this.currentIndex = 0;

        // DOM 元素
        this.modal = document.getElementById('screenshot-modal');
        this.modalTitle = document.getElementById('screenshot-modal-title');
        this.closeBtn = document.getElementById('close-screenshot-modal');
        this.mainImage = document.getElementById('modal-main-image');
        this.thumbnails = document.getElementById('modal-thumbnails');
        this.prevBtn = document.getElementById('modal-prev-btn');
        this.nextBtn = document.getElementById('modal-next-btn');

        // 绑定事件处理器
        this.handleClose = this.handleClose.bind(this);
        this.handlePrev = this.handlePrev.bind(this);
        this.handleNext = this.handleNext.bind(this);
        this.handleThumbnailClick = this.handleThumbnailClick.bind(this);

        this.bindEvents();
    }

    bindEvents() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', this.handleClose);
        }
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', this.handlePrev);
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', this.handleNext);
        }
        if (this.thumbnails) {
            this.thumbnails.addEventListener('click', this.handleThumbnailClick);
        }
    }

    open(taskId) {
        const task = this.app.jobsModule.allJobsCache
            .flatMap(j => j.tasks || [])
            .find(t => t._id === taskId);

        if (!task || !task.result?.screenshots?.length) return;

        this.screenshots = task.result.screenshots;
        this.currentIndex = 0;

        this.renderThumbnails();
        this.updateView();
        this.modal.classList.remove('hidden');
    }

    close() {
        if (this.modal) {
            this.modal.classList.add('hidden');
        }
        this.screenshots = [];
        this.currentIndex = 0;
    }

    handleClose() {
        this.close();
    }

    handlePrev() {
        this.changeImage(-1);
    }

    handleNext() {
        this.changeImage(1);
    }

    handleThumbnailClick(e) {
        const thumb = e.target.closest('.thumbnail-item');
        if (thumb) {
            this.currentIndex = parseInt(thumb.dataset.index, 10);
            this.updateView();
        }
    }

    changeImage(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.screenshots.length) {
            this.currentIndex = newIndex;
            this.updateView();
        }
    }

    renderThumbnails() {
        if (!this.thumbnails) return;

        this.thumbnails.innerHTML = this.screenshots.map((ss, index) => `
            <div class="thumbnail-item p-1 border-2 border-transparent rounded-md cursor-pointer hover:border-indigo-400" data-index="${index}">
                <img src="${ss.url}" alt="${ss.name}" class="w-full h-20 object-cover rounded">
                <p class="text-xs text-gray-600 truncate mt-1" title="${ss.name}">${ss.name}</p>
            </div>
        `).join('');
    }

    updateView() {
        if (this.screenshots.length === 0) return;

        const currentScreenshot = this.screenshots[this.currentIndex];

        // 更新主图片
        if (this.mainImage) {
            this.mainImage.src = currentScreenshot.url;
        }

        // 更新标题
        if (this.modalTitle) {
            this.modalTitle.textContent = `截图结果 (${this.currentIndex + 1} / ${this.screenshots.length}) - ${currentScreenshot.name}`;
        }

        // 更新缩略图激活状态
        if (this.thumbnails) {
            this.thumbnails.querySelectorAll('.thumbnail-item').forEach(thumb => {
                const isActive = parseInt(thumb.dataset.index, 10) === this.currentIndex;
                thumb.classList.toggle('active', isActive);
                if (isActive) {
                    thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }

        // 更新导航按钮
        if (this.prevBtn) {
            this.prevBtn.hidden = this.currentIndex === 0;
        }
        if (this.nextBtn) {
            this.nextBtn.hidden = this.currentIndex === this.screenshots.length - 1;
        }
    }

    // 资源清理
    unload() {
        if (this.closeBtn) {
            this.closeBtn.removeEventListener('click', this.handleClose);
        }
        if (this.prevBtn) {
            this.prevBtn.removeEventListener('click', this.handlePrev);
        }
        if (this.nextBtn) {
            this.nextBtn.removeEventListener('click', this.handleNext);
        }
        if (this.thumbnails) {
            this.thumbnails.removeEventListener('click', this.handleThumbnailClick);
        }
    }
}
