// Rich Text Email Template Editor
const TemplateEditor = {
    quill: null,
    currentTemplate: null,

    init() {
        // Quill will be initialized when modal opens
    },

    showCreateModal() {
        const modal = this.createEditorModal('Create Email Template');
        document.body.appendChild(modal);
        this.initializeQuill();
    },

    showCreateModalForRequest() {
        const modal = this.createEditorModal('Request Email Template');
        const submitBtn = modal.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4 mr-2"></i>Submit Request';
        
        const form = modal.querySelector('#template-editor-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const htmlContent = this.quill.root.innerHTML;

            const data = {
                name: formData.get('name'),
                subject: formData.get('subject'),
                category: formData.get('category'),
                body: htmlContent,
                preview_html: htmlContent.substring(0, 200)
            };

            try {
                await API.requestTemplate(data);
                Templates.showNotification('Template request submitted! Waiting for admin approval.', 'success');
                this.closeModal();
            } catch (error) {
                Templates.showNotification(`Error: ${error.message}`, 'error');
            }
        };
        
        document.body.appendChild(modal);
        this.initializeQuill();
        setTimeout(() => lucide.createIcons(), 50);
    },

    showEditModal(template) {
        this.currentTemplate = template;
        const modal = this.createEditorModal('Edit Email Template', template);
        document.body.appendChild(modal);
        this.initializeQuill();

        // Load the HTML content back into the editor
        setTimeout(() => {
            if (template.body && this.quill) {
                this.quill.root.innerHTML = template.body;
            }
        }, 150);
    },

    createEditorModal(title, template = null) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4';
        modal.id = 'template-editor-modal';

        const nameValue = template?.name || '';
        const subjectValue = template?.subject || '';
        const categoryValue = template?.category || '';

        modal.innerHTML = `
            <div class="rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col" style="background-color: var(--bg-primary); border: 1px solid var(--border-color)">
                <div class="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i data-lucide="edit-3" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold">${title}</h2>
                                <p class="text-blue-100 text-sm">Create beautiful HTML email templates</p>
                            </div>
                        </div>
                        <button onclick="TemplateEditor.closeModal()" class="text-white hover:text-blue-100 p-2 rounded-lg transition-colors">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6">
                    <form id="template-editor-form" class="space-y-5">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="space-y-2">
                                <label class="flex items-center text-sm font-semibold" style="color: var(--text-primary)">
                                    <i data-lucide="tag" class="w-4 h-4 mr-2 text-blue-600"></i>
                                    Template Name *
                                </label>
                                <input type="text" name="name" value="${nameValue}" required
                                    class="w-full p-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                    style="border-color: var(--border-color); background-color: var(--bg-accent); color: var(--text-primary)"
                                    placeholder="e.g., Welcome Email">
                            </div>
                            <div class="space-y-2">
                                <label class="flex items-center text-sm font-semibold" style="color: var(--text-primary)">
                                    <i data-lucide="folder" class="w-4 h-4 mr-2 text-blue-600"></i>
                                    Category *
                                </label>
                                <input type="text" name="category" value="${categoryValue}" required
                                    class="w-full p-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    style="border-color: var(--border-color); background-color: var(--bg-accent); color: var(--text-primary)"
                                    placeholder="e.g., Marketing">
                            </div>
                        </div>
                        
                        <div class="space-y-2">
                            <label class="flex items-center text-sm font-semibold" style="color: var(--text-primary)">
                                <i data-lucide="type" class="w-4 h-4 mr-2 text-blue-600"></i>
                                Subject Line *
                            </label>
                            <input type="text" name="subject" value="${subjectValue}" required
                                class="w-full p-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style="border-color: var(--border-color); background-color: var(--bg-accent); color: var(--text-primary)"
                                placeholder="e.g., Welcome to {{company}}!">
                            <p class="text-xs flex items-center" style="color: var(--text-secondary)">
                                <i data-lucide="info" class="w-3 h-3 mr-1"></i>
                                Use {{variable}} for dynamic content
                            </p>
                        </div>
                        
                        <div class="space-y-2">
                            <label class="flex items-center text-sm font-semibold" style="color: var(--text-primary)">
                                <i data-lucide="edit" class="w-4 h-4 mr-2 text-blue-600"></i>
                                Email Body *
                            </label>
                            <div id="quill-editor-wrapper" class="rounded-xl overflow-hidden" style="border: 2px solid var(--border-color);">
                                <div id="quill-editor" style="height: 400px; background-color: #ffffff;"></div>
                            </div>
                            <p class="text-xs flex items-center" style="color: var(--text-secondary)">
                                <i data-lucide="info" class="w-3 h-3 mr-1"></i>
                                Use {{name}}, {{email}}, {{company}} for personalization
                            </p>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4 border-t" style="border-color: var(--border-color)">
                            <button type="button" onclick="TemplateEditor.closeModal()" class="px-6 py-3 border-2 rounded-xl font-semibold transition-all" style="border-color: var(--border-color); color: var(--text-primary); background-color: var(--bg-accent)">
                                Cancel
                            </button>
                            <button type="submit" class="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center">
                                <i data-lucide="${template ? 'save' : 'plus'}" class="w-4 h-4 mr-2"></i>
                                ${template ? 'Update Template' : 'Create Template'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const form = modal.querySelector('#template-editor-form');
        form.onsubmit = (e) => this.handleSubmit(e, template);

        // Refresh Lucide icons after modal is added
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 50);

        return modal;
    },

    initializeQuill() {
        setTimeout(() => {
            const toolbarOptions = [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['clean']
            ];

            this.quill = new Quill('#quill-editor', {
                theme: 'snow',
                modules: {
                    toolbar: toolbarOptions
                },
                placeholder: 'Write your email content here...'
            });
        }, 100);
    },

    async handleSubmit(e, template) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const htmlContent = this.quill.root.innerHTML;

        const data = {
            name: formData.get('name'),
            subject: formData.get('subject'),
            category: formData.get('category'),
            body: htmlContent,
            preview_html: htmlContent.substring(0, 200)
        };

        try {
            if (template) {
                await API.updateTemplateAdmin(template.id, data);
                Templates.showNotification('Template updated successfully!', 'success');
            } else {
                await API.createTemplateAdmin(data);
                Templates.showNotification('Template created successfully!', 'success');
            }

            this.closeModal();
            Templates.load();
        } catch (error) {
            Templates.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    closeModal() {
        const modal = document.getElementById('template-editor-modal');
        if (modal) {
            modal.remove();
        }
        this.quill = null;
    }
};
