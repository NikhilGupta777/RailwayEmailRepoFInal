// Template Management Module
const Templates = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    isAdmin() {
        const user = Auth.getCurrentUser();
        return user && user.role === 'admin';
    },
    async load() {
        // Show/hide admin buttons
        const adminButtons = document.querySelector('.admin-only-buttons');
        if (adminButtons) {
            adminButtons.style.display = this.isAdmin() ? 'flex' : 'none';
        }

        // Add keyboard shortcut for search
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && document.getElementById('template-search')) {
                e.preventDefault();
                document.getElementById('template-search').focus();
            }
        });

        const grid = document.getElementById('templates-grid');
        grid.innerHTML = `<div class="col-span-full text-center p-8">
            <div class="lds-dual-ring mx-auto mb-4"></div>
            <p style="color: var(--text-secondary)">Loading templates...</p>
        </div>`;

        try {   
            const templates = await API.getTemplates();
            grid.innerHTML = '';

            // Show pending templates notification for admins
            if (this.isAdmin()) {
                try {
                    const pending = await API.getPendingTemplates();
                    if (pending && pending.length > 0) {
                        const notification = document.createElement('div');
                        notification.className = 'col-span-full mb-4 p-4 border-l-4 border-yellow-500 rounded';
                        notification.style.backgroundColor = 'rgba(234, 179, 8, 0.1)';
                        notification.innerHTML = `
                            <div class="flex justify-between items-center">
                                <div>
                                    <h4 class="font-bold" style="color: #ca8a04">⏳ ${pending.length} Template Request${pending.length > 1 ? 's' : ''} Pending Approval</h4>
                                    <p class="text-sm" style="color: #a16207">Review and approve user-submitted templates</p>
                                </div>
                                <button onclick="Templates.showPendingTemplates()" class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                                    Review Now
                                </button>
                            </div>
                        `;
                        grid.appendChild(notification);
                    }
                } catch (e) {
                    console.error('Failed to load pending templates:', e);
                }
            } else {
                // Show user's own requests status
                try {
                    const myRequests = await API.getMyTemplateRequests();
                    const pending = myRequests.filter(r => r.status === 'pending');
                    const rejected = myRequests.filter(r => r.status === 'rejected');

                    if (pending.length > 0 || rejected.length > 0) {
                        const notification = document.createElement('div');
                        notification.className = 'col-span-full mb-4 p-4 border-l-4 border-blue-500 rounded';
                        notification.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        notification.innerHTML = `
                            <div class="flex justify-between items-center">
                                <div>
                                    <h4 class="font-bold" style="color: #2563eb">📋 Your Template Requests</h4>
                                    <p class="text-sm" style="color: #1d4ed8">
                                        ${pending.length > 0 ? `${pending.length} pending approval` : ''}
                                        ${pending.length > 0 && rejected.length > 0 ? ', ' : ''}
                                        ${rejected.length > 0 ? `${rejected.length} rejected` : ''}
                                    </p>
                                </div>
                                <button onclick="Templates.showMyRequests()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                    View Status
                                </button>
                            </div>
                        `;
                        grid.appendChild(notification);
                    }
                } catch (e) {
                    console.error('Failed to load user requests:', e);
                }
            }

            // Add search bar with count
            const searchDiv = document.createElement('div');
            searchDiv.className = 'col-span-full mb-4';
            const approvedCount = templates.filter(t => t.status === 'approved' || !t.status).length;
            searchDiv.innerHTML = `
                <div class="flex items-center gap-3 mb-2">
                    <h3 class="text-lg font-semibold" style="color: var(--text-primary)">📧 Templates</h3>
                    <span class="px-3 py-1 rounded-full text-sm font-semibold" style="background-color: var(--bg-accent); color: var(--text-accent)">${approvedCount} available</span>
                </div>
                <div class="relative">
                    <input type="text" id="template-search" placeholder="🔍 Search templates by name, subject, or category..." 
                        class="w-full p-3 pr-20 border-2 rounded-xl transition-all focus:ring-2 focus:ring-blue-500"
                        style="border-color: var(--border-color); background-color: var(--bg-accent); color: var(--text-primary)"
                        oninput="Templates.filterTemplates()">
                    <kbd class="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded" style="background-color: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-secondary)">Ctrl+F</kbd>
                </div>
            `;
            grid.appendChild(searchDiv);

            // Add "Create Template" button for admins, "Request Template" for users
            const createCard = document.createElement('div');
            createCard.className = 'p-4 rounded-lg shadow hover:shadow-lg transition border-2 border-dashed border-blue-300 cursor-pointer template-card';
            if (this.isAdmin()) {
                createCard.innerHTML = `
                    <div class="text-center text-blue-500">
                        <div class="text-3xl mb-2">+</div>
                        <div class="font-bold">Create Template</div>
                        <div class="text-sm">Admin Only</div>
                    </div>
                `;
                createCard.onclick = () => this.showAdminCreateModal();
            } else {
                createCard.innerHTML = `
                    <div class="text-center text-purple-500">
                        <div class="text-3xl mb-2">📝</div>
                        <div class="font-bold">Request Template</div>
                        <div class="text-sm">Submit for Admin Approval</div>
                    </div>
                `;
                createCard.onclick = () => this.showRequestModal();
            }
            grid.appendChild(createCard);

            templates.forEach((template, index) => {
                // Only show approved templates in main view
                if (template.status === 'approved' || !template.status) {
                    const card = this.createTemplateCard(template);
                    card.classList.add('template-card');
                    card.dataset.name = template.name.toLowerCase();
                    card.dataset.subject = template.subject.toLowerCase();
                    card.dataset.category = template.category.toLowerCase();
                    // Stagger animation
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        card.style.transition = 'all 0.3s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 50);
                    grid.appendChild(card);
                }
            });

            // Show empty state if no templates
            const templateCards = templates.filter(t => t.status === 'approved' || !t.status);
            if (templateCards.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'col-span-full text-center p-12 border-2 border-dashed rounded-lg';
                emptyState.style.borderColor = 'var(--border-color)';
                emptyState.innerHTML = `
                    <i data-lucide="inbox" class="w-16 h-16 mx-auto mb-4" style="color: var(--text-secondary); opacity: 0.5"></i>
                    <h3 class="text-xl font-semibold mb-2" style="color: var(--text-primary)">No templates yet</h3>
                    <p style="color: var(--text-secondary)">${this.isAdmin() ? 'Create your first template to get started' : 'Request a template or wait for admin to create one'}</p>
                `;
                grid.appendChild(emptyState);
                setTimeout(() => lucide.createIcons(), 50);
            }
        } catch (error) {
            grid.innerHTML = `<div class="col-span-full text-center p-8 border rounded-lg" style="background-color: var(--bg-primary); border-color: var(--border-color)">
                <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-4 text-red-500"></i>
                <p class="text-red-500 font-semibold mb-2">Error loading templates</p>
                <p style="color: var(--text-secondary)" class="text-sm">${this.escapeHtml(error.message)}</p>
                <button onclick="Templates.load()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Retry</button>
            </div>`;
            setTimeout(() => lucide.createIcons(), 50);
        }
    },

    createTemplateCard(template) {
        const card = document.createElement('div');
        card.className = 'p-4 rounded-lg shadow hover:shadow-lg transition border';
        card.style.backgroundColor = 'var(--bg-primary)';
        card.style.borderColor = 'var(--border-color)';

        // Template header
        const header = document.createElement('div');
        header.className = 'flex justify-between items-start mb-2';

        const title = document.createElement('h3');
        title.className = 'font-bold text-lg';
        title.style.color = 'var(--text-primary)';
        title.textContent = template.name;

        // SendGrid badge
        if (template.sendgrid_template_id) {
            const badge = document.createElement('span');
            badge.className = 'text-xs px-2 py-1 rounded';
            badge.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
            badge.style.color = '#16a34a';
            badge.textContent = '✓ SendGrid';
            header.appendChild(badge);
        }

        header.appendChild(title);
        card.appendChild(header);

        // Template info - Category badge
        const category = document.createElement('span');
        category.className = 'inline-block text-xs px-2 py-1 rounded';
        category.style.backgroundColor = 'var(--bg-accent)';
        category.style.color = 'var(--text-accent)';
        category.textContent = template.category;

        const subject = document.createElement('p');
        subject.className = 'mt-2';
        subject.style.color = 'var(--text-primary)';
        subject.textContent = template.subject;

        // Created date
        const createdDate = document.createElement('p');
        createdDate.className = 'text-xs mt-1';
        createdDate.style.color = 'var(--text-secondary)';
        createdDate.textContent = `Created: ${new Date(template.created_at).toLocaleDateString()}`;

        // Variables display
        if (template.template_variables && template.template_variables.length > 0) {
            const varsDiv = document.createElement('div');
            varsDiv.className = 'mt-2';
            varsDiv.innerHTML = `<small style="color: var(--text-secondary)">Variables: ${template.template_variables.map(v => `<span class="px-1 py-0.5 rounded" style="background-color: var(--bg-accent); color: var(--text-accent)">{{${v}}}</span>`).join(' ')}</small>`;
            card.appendChild(varsDiv);
        }

        // Preview with click to expand
        const previewDiv = document.createElement('div');
        previewDiv.className = 'mt-3 p-2 border rounded cursor-pointer hover:shadow-md transition';
        previewDiv.style.maxHeight = '150px';
        previewDiv.style.overflow = 'auto';
        previewDiv.style.borderColor = 'var(--border-color)';
        previewDiv.style.backgroundColor = 'var(--bg-accent)';
        previewDiv.title = 'Click to view full preview';
        previewDiv.onclick = () => this.showPreviewModal(template);

        if (template.preview_html) {
            previewDiv.innerHTML = template.preview_html;
            previewDiv.style.fontSize = '11px';
            previewDiv.style.color = 'var(--text-primary)';
        } else if (template.body) {
            previewDiv.textContent = template.body.substring(0, 100) + (template.body.length > 100 ? '...' : '');
            previewDiv.style.color = 'var(--text-secondary)';
        } else {
            previewDiv.textContent = 'No preview available';
            previewDiv.style.fontStyle = 'italic';
            previewDiv.style.color = 'var(--text-secondary)';
            previewDiv.onclick = null;
            previewDiv.style.cursor = 'default';
        }

        // Admin buttons
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'mt-4 flex justify-between';

        if (this.isAdmin()) {
            const editBtn = document.createElement('button');
            editBtn.className = 'text-blue-500 hover:underline flex items-center';
            editBtn.innerHTML = '<i data-lucide="edit-3" class="w-4 h-4 mr-1"></i> Edit';
            editBtn.onclick = () => this.showAdminEditModal(template);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-red-500 hover:underline';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => this.delete(template.id, template.name);

            buttonsDiv.appendChild(editBtn);
            buttonsDiv.appendChild(deleteBtn);
        } else {
            buttonsDiv.innerHTML = '<span class="text-sm" style="color: var(--text-secondary)">Admin-managed template</span>';
        }

        const categoryWrapper = document.createElement('div');
        categoryWrapper.className = 'mb-2';
        categoryWrapper.appendChild(category);

        card.appendChild(categoryWrapper);
        card.appendChild(subject);
        card.appendChild(createdDate);
        card.appendChild(previewDiv);
        card.appendChild(buttonsDiv);

        // Refresh icons
        setTimeout(() => lucide.createIcons(), 50);

        return card;
    },

    async showRequestModal() {
        TemplateEditor.showCreateModalForRequest();
    },

    async showAdminCreateModal() {
        const modal = this.createAdminModal('Create Template');
        document.body.appendChild(modal);
    },

    async showAdminEditModal(template) {
        const modal = this.createAdminModal('Edit Template', template);
        document.body.appendChild(modal);
    },

    createAdminModal(title, template = null) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in';

        const nameValue = template?.name ? this.escapeHtml(template.name) : '';
        const categoryValue = template?.category ? this.escapeHtml(template.category) : '';
        const subjectValue = template?.subject ? this.escapeHtml(template.subject) : '';
        const templateIdValue = template?.sendgrid_template_id ? this.escapeHtml(template.sendgrid_template_id) : '';
        const variablesValue = template?.template_variables ? this.escapeHtml(template.template_variables.join(', ')) : '';

        modal.innerHTML = `
            <div class="rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" style="background-color: var(--bg-primary); border: 1px solid var(--border-color)">
                <!-- Header with gradient -->
                <div class="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i data-lucide="mail" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold">${this.escapeHtml(title)}</h2>
                                <p class="text-purple-100 text-sm">SendGrid Dynamic Template Integration</p>
                            </div>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-purple-100 p-2 rounded-lg transition-colors">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Form Content -->
                <div class="p-6">
                    <form id="templateForm" class="space-y-5">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="space-y-2">
                                <label class="flex items-center text-sm font-semibold" style="color: var(--text-primary)">
                                    <i data-lucide="tag" class="w-4 h-4 mr-2 text-purple-600"></i>
                                    Template Name *
                                </label>
                                <input type="text" name="name" class="w-full p-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500" value="${nameValue}" required
                                    style="border-color: var(--border-color); background-color: var(--bg-accent); color: var(--text-primary)"
                                    placeholder="e.g., Welcome Email">
                            </div>
                            <div class="space-y-2">
                                <label class="flex items-center text-sm font-semibold" style="color: var(--text-primary)">
                                    <i data-lucide="folder" class="w-4 h-4 mr-2 text-purple-600"></i>
                                    Category *
                                </label>
                                <input type="text" name="category" class="w-full p-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500" value="${categoryValue}" required
                                    style="border-color: var(--border-color); background-color: var(--bg-accent); color: var(--text-primary)"
                                    placeholder="e.g., Transactional">
                            </div>
                        </div>
                        
                        <div class="space-y-2">
                            <label class="flex items-center text-sm font-semibold" style="color: var(--text-primary)">
                                <i data-lucide="type" class="w-4 h-4 mr-2 text-purple-600"></i>
                                Subject Line *
                            </label>
                            <input type="text" name="subject" class="w-full p-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500" value="${subjectValue}" required
                                style="border-color: var(--border-color); background-color: var(--bg-accent); color: var(--text-primary)"
                                placeholder="e.g., Welcome to {{company}}!">
                            <p class="text-xs flex items-center" style="color: var(--text-secondary)">
                                <i data-lucide="info" class="w-3 h-3 mr-1"></i>
                                Use {{variable}} for dynamic content
                            </p>
                        </div>

                        <div class="p-4 rounded-xl" style="background-color: var(--bg-accent); border: 2px dashed var(--border-color)">
                            <div class="space-y-2">
                                <label class="flex items-center text-sm font-semibold" style="color: var(--text-primary)">
                                    <i data-lucide="key" class="w-4 h-4 mr-2 text-purple-600"></i>
                                    SendGrid Template ID *
                                </label>
                                <input type="text" name="sendgrid_template_id" class="w-full p-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500" value="${templateIdValue}" required
                                    style="border-color: var(--border-color); background-color: var(--bg-primary); color: var(--text-primary)"
                                    placeholder="d-1234567890abcdef">
                                <p class="text-xs flex items-start" style="color: var(--text-secondary)">
                                    <i data-lucide="external-link" class="w-3 h-3 mr-1 mt-0.5 flex-shrink-0"></i>
                                    <span>Get this from your SendGrid dashboard → Email API → Dynamic Templates</span>
                                </p>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label class="flex items-center text-sm font-semibold" style="color: var(--text-primary)">
                                <i data-lucide="code" class="w-4 h-4 mr-2 text-purple-600"></i>
                                Template Variables
                            </label>
                            <input type="text" name="template_variables" class="w-full p-3 border-2 rounded-xl transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500" value="${variablesValue}"
                                style="border-color: var(--border-color); background-color: var(--bg-accent); color: var(--text-primary)"
                                placeholder="name, email, company">
                            <p class="text-xs flex items-center" style="color: var(--text-secondary)">
                                <i data-lucide="info" class="w-3 h-3 mr-1"></i>
                                Comma-separated list (without {{}}). Must match your SendGrid template.
                            </p>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4 border-t" style="border-color: var(--border-color)">
                            <button type="button" onclick="this.closest('.fixed').remove()" class="px-6 py-3 border-2 rounded-xl font-semibold transition-all" style="border-color: var(--border-color); color: var(--text-primary); background-color: var(--bg-accent)">
                                Cancel
                            </button>
                            <button type="submit" class="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center">
                                <i data-lucide="${template ? 'save' : 'plus'}" class="w-4 h-4 mr-2"></i>
                                ${template ? 'Update Template' : 'Create Template'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Refresh Lucide icons
        setTimeout(() => lucide.createIcons(), 50);

        const form = modal.querySelector('#templateForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                subject: formData.get('subject'),
                body: '',  // Empty body for SendGrid templates
                category: formData.get('category'),
                sendgrid_template_id: formData.get('sendgrid_template_id'),
                preview_html: null,
                template_variables: formData.get('template_variables') ?
                    formData.get('template_variables').split(',').map(v => v.trim()).filter(v => v) : null
            };

            try {
                if (template) {
                    await API.updateTemplateAdmin(template.id, data);
                } else {
                    await API.createTemplateAdmin(data);
                }
                modal.remove();
                this.load();
                this.showNotification(`Template ${template ? 'updated' : 'created'} successfully!`, 'success');
            } catch (error) {
                this.showNotification(`Failed to ${template ? 'update' : 'create'} template: ${error.message}`, 'error');
            }
        };

        return modal;
    },

    async showCreateModal() {
        if (!this.isAdmin()) {
            this.showNotification('Only administrators can create templates', 'error');
            return;
        }
        this.showAdminCreateModal();
    },

    async edit(templateId) {
        if (!this.isAdmin()) {
            this.showNotification('Only administrators can edit templates', 'error');
            return;
        }
        // Find template and show admin edit modal
        const templates = await API.getTemplates();
        const template = templates.find(t => t.id === templateId);
        if (template) {
            this.showAdminEditModal(template);
        }
    },

    async delete(templateId, name) {
        if (confirm(`⚠️ Delete template "${name}"?\n\nThis action cannot be undone.`)) {
            const deleteBtn = event.target;
            const originalText = deleteBtn.textContent;
            deleteBtn.textContent = 'Deleting...';
            deleteBtn.disabled = true;

            try {
                await API.deleteTemplate(templateId);
                this.showNotification('Template deleted successfully', 'success');
                Templates.load();
            } catch (error) {
                this.showNotification(`Failed to delete: ${error.message}`, 'error');
                deleteBtn.textContent = originalText;
                deleteBtn.disabled = false;
            }
        }
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const styles = {
            error: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#dc2626' },
            success: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#16a34a' },
            info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#2563eb' }
        };
        const style = styles[type] || styles.info;
        notification.className = 'fixed top-4 right-4 p-4 border-2 rounded-lg z-50 shadow-lg animate-fade-in';
        notification.style.backgroundColor = style.bg;
        notification.style.borderColor = style.border;
        notification.style.color = style.text;
        notification.style.fontWeight = '500';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    },

    async showPendingTemplates() {
        const pending = await API.getPendingTemplates();
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4';

        modal.innerHTML = `
            <div class="rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden" style="background-color: var(--bg-primary)">
                <div class="p-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold">⏳ Pending Template Requests (${pending.length})</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-gray-200">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>
                <div class="p-6 max-h-96 overflow-y-auto">
                    ${pending.length === 0 ? '<p class="text-center text-gray-500">No pending requests</p>' : ''}
                    ${pending.map(t => `
                        <div class="mb-4 p-4 border rounded" style="border-color: var(--border-color)">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h3 class="font-bold" style="color: var(--text-primary)">${this.escapeHtml(t.name)}</h3>
                                    <p class="text-sm" style="color: var(--text-secondary)">Category: ${this.escapeHtml(t.category)}</p>
                                    <p class="text-sm" style="color: var(--text-secondary)">Subject: ${this.escapeHtml(t.subject)}</p>
                                    <p class="text-xs mt-1" style="color: var(--text-secondary)">Requested by: ${this.escapeHtml(t.creator_name)} on ${new Date(t.created_at).toLocaleDateString()}</p>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="Templates.approveTemplate('${t.id}')" class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
                                        ✓ Approve
                                    </button>
                                    <button onclick="Templates.rejectTemplateWithReason('${t.id}')" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                                        ✗ Reject
                                    </button>
                                </div>
                            </div>
                            ${t.body ? `<details class="mt-2"><summary class="cursor-pointer text-sm text-blue-600">View Preview</summary><div class="mt-2 p-3 border rounded max-h-48 overflow-auto" style="background-color: var(--bg-accent); font-size: 12px;">${t.body}</div></details>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        setTimeout(() => lucide.createIcons(), 50);
        document.body.appendChild(modal);
    },

    async approveTemplate(templateId) {
        try {
            await API.approveTemplate(templateId);
            this.showNotification('Template approved!', 'success');
            document.querySelector('.fixed')?.remove();
            this.load();
        } catch (error) {
            this.showNotification('Failed to approve: ' + error.message, 'error');
        }
    },

    async rejectTemplate(templateId) {
        try {
            await API.rejectTemplate(templateId, '');
            this.showNotification('Template rejected', 'success');
            document.querySelector('.fixed')?.remove();
            this.load();
        } catch (error) {
            this.showNotification('Failed to reject: ' + error.message, 'error');
        }
    },

    async rejectTemplateWithReason(templateId) {
        const reason = prompt('Rejection reason (optional):');
        if (reason !== null) {
            try {
                await API.rejectTemplate(templateId, reason);
                this.showNotification('Template rejected', 'success');
                document.querySelector('.fixed')?.remove();
                this.load();
            } catch (error) {
                this.showNotification('Failed to reject: ' + error.message, 'error');
            }
        }
    },

    async showMyRequests() {
        const requests = await API.getMyTemplateRequests();
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4';

        modal.innerHTML = `
            <div class="rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" style="background-color: var(--bg-primary)">
                <div class="p-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold">📋 My Template Requests</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-gray-200">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>
                <div class="p-6 max-h-96 overflow-y-auto">
                    ${requests.length === 0 ? '<p class="text-center text-gray-500">No requests yet</p>' : ''}
                    ${requests.map(t => `
                        <div class="mb-3 p-4 border rounded" style="border-color: var(--border-color)">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h3 class="font-bold" style="color: var(--text-primary)">${this.escapeHtml(t.name)}</h3>
                                    <p class="text-sm" style="color: var(--text-secondary)">${this.escapeHtml(t.subject)}</p>
                                    <p class="text-xs mt-1" style="color: var(--text-secondary)">Submitted: ${new Date(t.created_at).toLocaleDateString()}</p>
                                </div>
                                <span class="px-3 py-1 rounded text-sm font-semibold" style="${t.status === 'approved' ? 'background-color: rgba(34, 197, 94, 0.2); color: #16a34a' :
                t.status === 'pending' ? 'background-color: rgba(234, 179, 8, 0.2); color: #ca8a04' :
                    'background-color: rgba(239, 68, 68, 0.2); color: #dc2626'
            }">
                                    ${t.status === 'approved' ? '✓ Approved' : t.status === 'pending' ? '⏳ Pending' : '✗ Rejected'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        setTimeout(() => lucide.createIcons(), 50);
        document.body.appendChild(modal);
    },

    showConfirm(message) {
        return confirm(message);
    },

    showPrompt(message) {
        return prompt(message);
    },

    showPreviewModal(template) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.innerHTML = `
            <div class="rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden" style="background-color: var(--bg-primary); border: 1px solid var(--border-color)">
                <div class="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-2xl font-bold">${this.escapeHtml(template.name)}</h2>
                            <p class="text-blue-100 text-sm mt-1">${this.escapeHtml(template.subject)}</p>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-blue-100 p-2 rounded-lg transition-colors">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>
                <div class="p-6">
                    <div class="mb-4 flex items-center justify-between">
                        <div class="flex gap-2">
                            <span class="px-3 py-1 rounded text-sm" style="background-color: var(--bg-accent); color: var(--text-accent)">${this.escapeHtml(template.category)}</span>
                            ${template.sendgrid_template_id ? '<span class="px-3 py-1 rounded text-sm" style="background-color: rgba(34, 197, 94, 0.2); color: #16a34a">✓ SendGrid</span>' : ''}
                        </div>
                        <button onclick="Templates.copyTemplateId('${template.sendgrid_template_id || template.id}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                            Copy ID
                        </button>
                    </div>
                    ${template.template_variables && template.template_variables.length > 0 ? `
                        <div class="mb-4 p-3 rounded-lg" style="background-color: var(--bg-accent)">
                            <p class="text-sm font-semibold mb-2" style="color: var(--text-primary)">Template Variables:</p>
                            <div class="flex flex-wrap gap-2">
                                ${template.template_variables.map(v => `<code class="px-2 py-1 rounded text-sm" style="background-color: var(--bg-primary); color: var(--text-accent)">{{${this.escapeHtml(v)}}}</code>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <div class="border-2 rounded-lg p-4 max-h-96 overflow-auto" style="border-color: var(--border-color); background-color: var(--bg-accent)">
                        ${template.preview_html || template.body ?
                (template.preview_html ? template.preview_html : `<pre style="color: var(--text-primary); white-space: pre-wrap; font-size: 13px;">${this.escapeHtml(template.body)}</pre>`) :
                '<p style="color: var(--text-secondary); font-style: italic;">No preview available</p>'
            }
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => lucide.createIcons(), 50);
    },

    copyTemplateId(id) {
        navigator.clipboard.writeText(id).then(() => {
            this.showNotification('Template ID copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy ID', 'error');
        });
    },

    filterTemplates() {
        const searchTerm = document.getElementById('template-search')?.value.toLowerCase() || '';
        const cards = document.querySelectorAll('.template-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const name = card.dataset.name || '';
            const subject = card.dataset.subject || '';
            const category = card.dataset.category || '';

            if (name.includes(searchTerm) || subject.includes(searchTerm) || category.includes(searchTerm)) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show/hide empty state
        const grid = document.getElementById('templates-grid');
        let emptyState = grid.querySelector('.search-empty-state');

        if (visibleCount === 0 && searchTerm) {
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'col-span-full text-center p-8 search-empty-state';
                emptyState.innerHTML = `
                    <i data-lucide="search-x" class="w-12 h-12 mx-auto mb-3" style="color: var(--text-secondary); opacity: 0.5"></i>
                    <p style="color: var(--text-primary)">No templates found for "${this.escapeHtml(searchTerm)}"</p>
                `;
                grid.appendChild(emptyState);
                setTimeout(() => lucide.createIcons(), 50);
            }
        } else if (emptyState) {
            emptyState.remove();
        }
    }
};