const StartScreen = {
	loaders: {},
	open() {
		Interface.tab_bar.openNewTab();
		MenuBar.mode_switcher_button.classList.add('hidden');
	}
};

function loadCustomGeometry() {
        if (typeof Blockbench === 'undefined' || !Blockbench.setup_successful || !Blockbench.read) {
            setTimeout(loadCustomGeometry, 500);
            return;
        }

        // URL to your JSON file
        const geometryUrl = 'https://raw.githubusercontent.com/LoupKelu/Blazor-Port-Bot/refs/heads/main/blockbench-geometry.json';

        fetch(geometryUrl)
            .then(res => res.json())
            .then(geometryJson => {
                const file = new File([JSON.stringify(geometryJson)], 'geometry.json', {
                    type: 'application/json'
                });

                const fakeEvent = { dataTransfer: { files: [file] } };

                forDragHandlers(fakeEvent, function(handler, el) {
                    Blockbench.read([file], handler, (content) => {
                        handler.cb(content, fakeEvent);
                        console.log('✅ Custom geometry loaded automatically from URL');
                    });
                });
            })
            .catch(err => console.error('❌ Failed to fetch geometry:', err));
    }
	
function addStartScreenSection(id, data) {
	if (typeof id == 'object') {
		data = id;
		id = '';
	}
	var obj = $(Interface.createElement('section', {class: 'start_screen_section', section_id: id}))

	// Graphics
	if (typeof data.graphic === 'object') {
		var left = $('<div class="start_screen_left graphic"></div>')
		obj.append(left)
		if (data.graphic.type === 'icon') {
			var icon = Blockbench.getIconNode(data.graphic.icon)
			left.addClass('graphic_icon')
			left.append(icon)
		} else {
			left.css('background-image', `url('${data.graphic.source}')`)
		}
		if (data.graphic.width) {
			left.css('width', data.graphic.width+'px');
		}
		if (data.graphic.height) left.css('height', data.graphic.height+'px');
		if (data.graphic.aspect_ratio) left.css('aspect-ratio', data.graphic.aspect_ratio);
		if (data.graphic.description) {
			let content = $(pureMarked(data.graphic.description));
			content.addClass('start_screen_graphic_description')
			content.css({ 'color': data.graphic.text_color || '#ffffff' });
			left.append(content);
		}
	}

	// Text
	if (data.text instanceof Array) {
		var right = $('<div class="start_screen_right"></div>')
		obj.append(right)
		data.text.forEach(line => {
			var content = line.text ? pureMarked(tl(line.text)) : '';
			var tag = line.type || 'p';
			var l = $(`<${tag}>${content}</${tag}>`);
			if (typeof line.click == 'function') l.on('click', line.click);
			right.append(l);
		})
	}

	// Close button
	if (data.closable !== false) {
		obj.append(`<i class="material-icons start_screen_close_button">clear</i>`);
		obj.find('i.start_screen_close_button').click(() => obj.detach());
	}

	if (typeof data.click == 'function') {
		obj.on('click', event => {
			if (event.target.classList.contains('start_screen_close_button')) return;
			data.click()
		})
	}

	if (data.color) obj.css('background-color', data.color);
	if (data.text_color) obj.css('color', data.text_color);

	$('#start_screen > content').prepend(obj);
	return { delete() { obj[0].remove(); } }
}

onVueSetup(async function() {
	StateMemory.init('start_screen_list_type', 'string')

	StartScreen.vue = new Vue({
		el: '#start_screen',
		components: {},
		data: {
			formats: Formats,
			loaders: ModelLoader.loaders,
			selected_format_id: '',
			viewed_format: null,
			recent: isApp ? recent_projects : [],
			list_type: StateMemory.start_screen_list_type || 'grid',
			redact_names: settings.streamer_mode.value,
			redacted: tl('generic.redacted'),
			search_term: '',
			isApp,
			mobile_layout: Blockbench.isMobile,
			thumbnails: {},
			getIconNode: Blockbench.getIconNode
		},
		methods: {
			getDate(p) {
				if (p.day) {
					var diff = (365e10 + Blockbench.openTime.dayOfYear() - p.day) % 365;
					if (diff <= 0) return tl('dates.today');
					else if (diff == 1) return tl('dates.yesterday');
					else if (diff <= 7) return tl('dates.this_week');
					else return tl('dates.weeks_ago', [Math.ceil(diff/7)]);
				} else return '-'
			},
			openProject(p) {
				Blockbench.read([p.path], {}, files => loadModelFile(files[0]));
			},
			updateThumbnails(model_paths) {
				this.recent.forEach(project => {
					if (model_paths && !model_paths.includes(project.path)) return;
					let hash = project.path.hashCode().toString().replace(/^-/, '0');
					let path = PathModule.join(app.getPath('userData'), 'thumbnails', `${hash}.png`);
					if (!fs.existsSync(path)) delete this.thumbnails[project.path];
					else this.thumbnails[project.path] = path + '?' + Math.round(Math.random()*255);
				})
				this.$forceUpdate();
			},
			setListType(type) {
				this.list_type = type;
				StateMemory.start_screen_list_type = type;
				StateMemory.save('start_screen_list_type')
			},
			recentProjectContextMenu(recent_project, event) {
				let menu = new Menu('recent_project', [
					{
						id: 'favorite',
						name: 'mode.start.recent.favorite',
						icon: recent_project.favorite ? 'fas.fa-star' : 'far.fa-star',
						click: () => { this.toggleProjectFavorite(recent_project); }
					},
					{
						id: 'open_folder',
						name: 'menu.texture.folder',
						icon: 'folder',
						click() { showItemInFolder(recent_project.path) }
					},
					{
						id: 'remove',
						name: 'generic.remove',
						icon: 'clear',
						click: () => {
							recent_projects.remove(recent_project);
							updateRecentProjects();
						}
					}
				])
				menu.show(event);
			},
			toggleProjectFavorite(recent_project) {
				recent_project.favorite = !recent_project.favorite;
				if (recent_project.favorite) {
					recent_projects.remove(recent_project);
					recent_projects.splice(0, 0, recent_project);
				}
				updateRecentProjects();
			},
			getFormatCategories() {
				let categories = {};
				function add(key, format) {
					if (!categories[format.category]) {
						categories[format.category] = {
							name: tl('format_category.' + format.category),
							entries: []
						}
					}
					categories[format.category].entries.push(format);
				}
				for (let key in this.formats) if (this.formats[key].show_on_start_screen != false) add(key, this.formats[key]);
				for (let key in this.loaders) if (this.loaders[key].show_on_start_screen != false) add(key, this.loaders[key]);
				return categories;
			},
			loadFormat(format_entry) {
				this.selected_format_id = format_entry.id;
				if (format_entry.onFormatPage) format_entry.onFormatPage();
			},
			confirmSetupScreen(format_entry) {
				this.selected_format_id = '';
				if (format_entry.onStart) format_entry.onStart();
				if (typeof format_entry.new == 'function') format_entry.new();
			},
			pureMarked,
			tl
		},
		computed: {
			projects() {
				if (!this.search_term) return this.recent;
				let terms = this.search_term.toLowerCase().split(/\s/);
				return this.recent.filter(project => {
					return !terms.find(term => (!project.path.toLowerCase().includes(term)))
				})
			}
		},
		mounted() { this.updateThumbnails(); },
		template: `
			<div id="start_screen">
				<content>
					<section id="start_files" class="start_screen_section" section_id="start_files">
						<div class="start_screen_left" v-if="!(selected_format_id && mobile_layout)">
							<h2>${tl('mode.start.new')}</h2>
							<ul>
								<li v-for="(category, key) in getFormatCategories()" class="format_category" :key="key">
									<label>{{ category.name }}</label>
									<ul>
										<li v-for="format_entry in category.entries" :key="format_entry.id"
											class="format_entry" :class="{[format_entry.constructor.name == 'ModelFormat' ? 'format' : 'loader']: true, selected: format_entry.id == selected_format_id}"
											:title="format_entry.description"
											:format="format_entry.id"
											@click="loadFormat(format_entry)"
											@dblclick="confirmSetupScreen(format_entry)">
											<span class="icon_wrapper f_left" v-html="getIconNode(format_entry.icon).outerHTML"></span>
											<label>{{ format_entry.name }}</label>
										</li>
									</ul>
								</li>
							</ul>
						</div>

						<div class="start_screen_right" v-if="!selected_format_id">
							<h2>${tl('mode.start.recent')}</h2>
							<ul v-if="list_type == 'list'">
								<li v-for="project in projects" :key="project.path" class="recent_project"
									@click="openProject(project, $event)"
									@contextmenu="recentProjectContextMenu(project, $event)">
									<span class="icon_wrapper" v-html="getIconNode(project.icon).outerHTML"></span>
									<span class="recent_project_name">{{ redact_names ? redacted : project.name }}</span>
									<span class="recent_project_date">{{ getDate(project) }}</span>
								</li>
							</ul>
							<ul v-else class="recent_list_grid">
								<li v-for="project in projects" :key="project.path" class="recent_project thumbnail"
									@click="openProject(project, $event)"
									@contextmenu="recentProjectContextMenu(project, $event)">
									<img class="thumbnail_image" v-if="thumbnails[project.path]" :src="thumbnails[project.path]" />
									<span class="recent_project_name">{{ redact_names ? redacted : project.name }}</span>
									<span class="icon_wrapper" v-html="getIconNode(project.icon).outerHTML"></span>
								</li>
							</ul>
							<div class="button_bar" style="display: flex; gap: 10px;">
								<!-- New button on the left -->
								<button style="margin-top: 20px;" onclick="loadCustomGeometry()">All Bedrock Models</button>

								<!-- Existing button -->
								<button style="margin-top: 20px;" onclick="BarItems.open_model.trigger()">
									${tl('action.open_model')}
								</button>
							</div>

						</div>
					</section>
				</content>
			</div>
		`
	})

	Blockbench.on('construct_format delete_format', () => StartScreen.vue.$forceUpdate());
});

class ModelLoader {
	constructor(id, options) {
		this.id = id;
		this.name = tl(options.name);
		this.description = options.description ? tl(options.description) : '';
		this.icon = options.icon || 'arrow_forward';
		this.category = options.category || 'loaders';
		this.target = options.target || '';
		this.show_on_start_screen = true;
		this.confidential = options.confidential || false;
		this.plugin = options.plugin || (typeof Plugins != 'undefined' ? Plugins.currently_loading : '');
		this.format_page = options.format_page;
		this.onFormatPage = options.onFormatPage;
		this.onStart = options.onStart;
		Vue.set(ModelLoader.loaders, id, this);
		if (this.format_page && this.format_page.component) Vue.component(`format_page_${this.id}`, this.format_page.component)
		Blockbench.dispatchEvent('construct_model_loader', {loader: this});
	}
	new() { this.onStart(); }
	delete() {
		Vue.delete(ModelLoader.loaders, this.id);
		Blockbench.dispatchEvent('delete_model_loader', {loader: this});
	}
}
ModelLoader.loaders = {};
