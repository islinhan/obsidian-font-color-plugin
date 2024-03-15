import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Menu, addIcon} from 'obsidian';

// Remember to rename these classes and interfaces!

interface FontColorSettings {
	labelName: string;
	className: Array;
}

const DEFAULT_SETTINGS: FontColorSettings = {
	labelName: 'font',
	className: ["red", "green", "blue", "orange", "yellow", "purple", "indigo", "free"]
}

interface ILabel {	
	type: "string";
	isLegal: false;
}

// Use the char ' in property value.
class ControllableString implements ILabel {
	
	// <tag>  </tag>
	//      ^ ^   
	//      s e
	private s: number = 0;
	private e: number = 0;
	
	private l: string = "";
	private r: string = "";
	
	private text: string = "";
	
	constructor(text: string) {		
		if(text.length > 0) {
			this.text = text;
			this.init();
		}
	}
	
	getText(): string {
		return this.l + this.text + this.r;
	}
	
	getChangeText(callback: Function): string {
		return this.l + callback(this.text) + this.r;
	}

	contentToString(): ControllableString {
		if(this.isLegal) return new ControllableString(this.text.substring(this.s, this.e));
		return null;
	}
	
	changePropertyValue(property: string, callback: Function): void {		
		if(this.isLegal) {
			this.changePropertyValue0(property, callback);
		}
	}
	
	private init(): void {
		
		// Detach left and right special symbol.
		let j: number = -1, char: string = null
		
		while(++j < this.text.length) {		
			char = this.text.charAt(j);
			if(this.isSpecialSymbol(char)) {
				this.l += char;
			} else break;
		}
		
		if(this.l.length == this.text.length) {
			this.text = "";
			return;
		}
		
		j = this.text.length;
		while(--j >= this.l.length) {		
			char = this.text.charAt(j);
			if(this.isSpecialSymbol(char)) {
				this.r = char + this.r;
			} else break;
		}
		
		this.text = this.text.substring(this.l.length, this.text.length - this.r.length);
		j = this.text.length - 1;
		
		// Check suffix
		let s: number = 0, e: number = 0, temp: number = 0, type: string = null;
		
		if(this.text.charAt(j) != ">") return;
		// Max length of Label name is 20, includes left and right spaces.
		while(temp < 20 && --j > 0 && this.text.charAt(j) != "/") {
			temp++;
		}		
		e = j - 1;	
		if(e < 1 || this.text.charAt(e) != "<") return;
		
		// Find label name
		type = this.text.substring(j + 1, this.text.length - 1).trim();		
		if(type.length == 0) return;
		
		// Check prefix
		s = type.length + 1; 
		if(this.text.substring(0, s) != "<" + type || this.text.charAt(s) != " " && this.text.charAt(s) != ">") return;
		let isFindPrefix: boolean = false;
		
		for(temp = 0; s < e; s++) {
			char = this.text.charAt(s);
			if(char == '"') {
				temp++
			} else if(char == ">" && (temp&1) == 0) {
				isFindPrefix = true;
				break;
			}
		}
		if(!isFindPrefix) return;
		
		// Setting properties after confirming the label
		this.s = s + 1;
		this.e = e;
		this.type = type;
		this.isLegal = true;		
	}
	
	private isSpecialSymbol(char: string): boolean {
		return char == "\n" 
			|| char == "\r" 
			|| char == "\t" 
			|| char == " ";
	}
		
	private changePropertyValue0(property: string, callback: Function): void {
		
		let mark: number = 0,
		i: number = this.type.length + 1, 
		len: number = this.s - 1,
		s: number = 0, 
		e: number = 0;
		
		const f: string = property.charAt(0);
		for(; i < len; i++) {
			let char: string = this.text.charAt(i);
			switch(char) {
				case " ":
					break;
				case f:
					if((mark&1) != 1 && this.text.substring(i, i + property.length) == property) {
						i += property.length - 1;
						mark |= 1;
					}
					break;
				case "=":
					if((mark&1) == 1) {
						mark |= 2;
					}
					break;
				case '"':
					if((mark&4) == 4) {
						e = i;						
						i = len;
						mark |= 8;
					} else if((mark&2) == 2) {
						s = i + 1;
						mark |= 4;
					}
					break;
				default:
					if((mark&7) != 7) mark = 0;
					break;
			}
		}
		
		if((mark&15) == 15) {		
			// Find property
			let value: string = callback(this.text.substring(s,e));
			this.text = this.text.substring(0, s)
				+ value
				+ this.text.substring(e, this.text.length);
			let n: number = value.length - (e - s);
			this.s += n;
			this.e += n;
		} else {
			// NO find property, create specified property
			let value: string = callback("");
			this.text = this.text.substring(0, this.type.length + 1).trim()
				+ " " + property + '="' + value + '" '
				+ this.text.substring(this.type.length + 1, this.text.length).trim();
			this.s += value.length;
			this.e += value.length;
		}
		
	}
	
}

let settings: FontColorSettings = null;
export default class FontColorPlugin extends Plugin {
	settings: FontColorSettings;

	async onload() {
		await this.loadSettings();
		
		settings = this.settings;
		
		// Load svg file
		addIcon("pigment", `<defs/><mask id="mask_4_8" fill="white"><path id="reduce_id" d="M9.83514 36.7052C15.2669 16.4335 36.9687 4.6351 58.3073 10.3528C79.6459 16.0704 92.541 37.139 87.1092 57.4107C81.6774 77.6824 59.9757 89.4808 38.6371 83.7631C34.7634 82.7252 31.168 81.1814 27.91 79.2283L46.3347 50.6238C46.3797 50.6375 46.4251 50.6505 46.471 50.6628C48.6048 51.2346 50.7982 49.9683 51.3699 47.8344C51.9417 45.7005 50.6754 43.5072 48.5415 42.9354C46.4077 42.3636 44.2143 43.63 43.6425 45.7639C43.586 45.9748 43.5475 46.1864 43.5259 46.3969L8.70364 48.9316C8.3898 44.912 8.73996 40.7924 9.83514 36.7052Z" clip-rule="evenodd" fill="" fill-opacity="1.000000" fill-rule="evenodd"/></mask><path id="reduce_id" d="M9.83514 36.7052C15.2669 16.4335 36.9687 4.6351 58.3073 10.3528C79.6459 16.0704 92.541 37.139 87.1092 57.4107C81.6774 77.6824 59.9757 89.4808 38.6371 83.7631C34.7634 82.7252 31.168 81.1814 27.91 79.2283L46.3347 50.6238C46.3797 50.6375 46.4251 50.6505 46.471 50.6628C48.6048 51.2346 50.7982 49.9683 51.3699 47.8344C51.9417 45.7005 50.6754 43.5072 48.5415 42.9354C46.4077 42.3636 44.2143 43.63 43.6425 45.7639C43.586 45.9748 43.5475 46.1864 43.5259 46.3969L8.70364 48.9316C8.3898 44.912 8.73996 40.7924 9.83514 36.7052Z" clip-rule="evenodd" fill="#F2B52B" fill-opacity="1.000000" fill-rule="evenodd" mask="url(#mask_4_8)"/><path id="reduce_id" d="M58.3073 10.3528C36.9687 4.6351 15.2669 16.4335 9.83514 36.7052C9.01093 39.7811 8.60868 42.8755 8.59386 45.9317C8.58961 46.8079 8.61721 47.6809 8.67583 48.5495C8.68443 48.677 8.69371 48.8044 8.70364 48.9316L43.5259 46.3969C43.5475 46.1864 43.586 45.9748 43.6425 45.7639C44.2143 43.63 46.4077 42.3636 48.5415 42.9354C50.6754 43.5072 51.9417 45.7005 51.3699 47.8344C50.7982 49.9683 48.6048 51.2346 46.471 50.6628C46.4251 50.6505 46.3797 50.6375 46.3347 50.6238L29.5354 76.7048L27.91 79.2283C28.765 79.7408 29.6433 80.2252 30.5437 80.6796C33.0743 81.9568 35.78 82.9976 38.6371 83.7631C59.9757 89.4808 81.6774 77.6824 87.1092 57.4107C92.541 37.139 79.6459 16.0704 58.3073 10.3528ZM32.1773 78.1434Q32.286 78.1972 32.3959 78.2507Q35.7465 79.8828 39.4135 80.8653Q47.5641 83.0493 55.2016 81.8806Q61.4766 80.9205 67.4053 77.6973Q74.5381 73.8194 78.8917 67.8982Q82.5129 62.9731 84.2114 56.6342Q85.9099 50.2954 85.2364 44.2194Q84.4266 36.9147 80.1884 29.9901Q76.6656 24.2344 71.7114 20.2654Q65.6814 15.4345 57.5308 13.2505Q49.3804 11.0666 41.7429 12.2352Q35.4678 13.1954 29.5391 16.4186Q22.4063 20.2964 18.0527 26.2176Q14.4314 31.1428 12.7329 37.4816Q11.9356 40.4571 11.6956 43.4769Q11.607 44.5921 11.5944 45.7133L41.2893 43.5517Q41.5676 43.0037 41.9354 42.5243Q42.7508 41.4618 44.0062 40.7369Q45.2618 40.0121 46.5897 39.8372Q47.9176 39.6624 49.318 40.0376Q50.7183 40.4128 51.7809 41.2282Q52.8435 42.0436 53.5684 43.2991Q54.2933 44.5546 54.4681 45.8825Q54.643 47.2104 54.2677 48.6109Q53.8925 50.0112 53.0771 51.0738Q52.2618 52.1364 51.0062 52.8613Q49.7507 53.5862 48.4228 53.761Q48.1383 53.7985 47.8505 53.8107L32.1773 78.1434Z" clip-rule="evenodd" fill="#9F7507" fill-opacity="1.000000" fill-rule="evenodd"/><circle id="ellipse_id 14" cx="63.972168" cy="62.557953" r="7.500000" fill="#1A7BF1" fill-opacity="1.000000"/><circle id="ellipse_id 13" cx="70.972168" cy="39.557953" r="7.500000" fill="#42EF00" fill-opacity="1.000000"/><circle id="ellipse_id 11" cx="52.972168" cy="25.557953" r="7.500000" fill="#FF3C1D" fill-opacity="1.000000"/>`);
		addIcon("color", `<defs><linearGradient id="paint_linear_4_5_0" x1="63.999992" y1="7.499962" x2="12.000011" y2="116.500000" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFFF"/><stop offset="0.463660" stop-color="#EFCE00" stop-opacity="0.521569"/><stop offset="1.000000" stop-color="#FF0A0A" stop-opacity="0.615686"/></linearGradient></defs><mask id="mask4_1" mask-type="alpha" maskUnits="userSpaceOnUse" x="0.000000" y="0.000000" width="90.000000" height="90.000000"><mask id="mask2_5" mask-type="alpha" maskUnits="userSpaceOnUse" x="0.000000" y="0.000000" width="90.000000" height="90.000000"><path id="椭圆 1" d="M45 0C20.1472 0 0 20.1472 0 45C0 69.8528 20.1472 90 45 90C69.8528 90 90 69.8528 90 45C90 20.1472 69.8528 0 45 0ZM52.6777 63.5355Q49.1422 65 45 65Q40.8578 65 37.3223 63.5355Q33.7868 62.071 30.8578 59.1421Q27.9289 56.2132 26.4645 52.6776Q25 49.1421 25 45Q25 40.8579 26.4644 37.3224Q27.9289 33.7868 30.8579 30.8579Q33.7868 27.9289 37.3224 26.4644Q40.8579 25 45 25Q49.1421 25 52.6776 26.4644Q56.2132 27.9289 59.1421 30.8578Q62.0711 33.7868 63.5356 37.3224Q65 40.8579 65 45Q65 49.1422 63.5355 52.6777Q62.0711 56.2132 59.1422 59.1422Q56.2132 62.0711 52.6777 63.5355Z" fill="#05AEFA" fill-opacity="1.000000" fill-rule="evenodd"/></mask><g mask="url(#mask2_5)"><ellipse id="id_ellipse 3" cx="37.350006" cy="76.049988" rx="50.849998" ry="33.750000" fill="#5C5C5C" fill-opacity="1.000000"/></g><g mask="url(#mask2_5)"><ellipse id="id_ellipse 2" cx="18.014832" cy="35.223877" rx="38.031300" ry="25.820894" fill="#5C5C5C" fill-opacity="1.000000"/></g><g mask="url(#mask2_5)"><ellipse id="id_ellipse 7" cx="48.410217" cy="15.820892" rx="40.403625" ry="20.895521" fill="#5C5C5C" fill-opacity="1.000000"/><ellipse id="id_ellipse 7" cx="48.410217" cy="15.820892" rx="40.403625" ry="20.895521" stroke="#000000" stroke-opacity="1.000000" stroke-width="0.000000"/></g></mask><g mask="url(#mask4_1)"><circle id="id_ellipse 8" cx="45.000000" cy="45.000000" r="45.000000" fill="url(#paint_linear_4_5_0)" fill-opacity="1.000000"/></g>`);
		
		// Menu item of change text color
		this.registerEvent(
		  this.app.workspace.on("editor-menu", (menu, editor, view) => {
			  
			menu.addItem((item) => {
				
				const subMenu: Menu = item.setTitle("color").setIcon("pigment").setSubmenu();
					
				for(let i: number = 0; i < settings.className.length; i++) {
					
					subMenu.addItem((subItem) => {
						subItem
						.setTitle(settings.className[i])
						.setIcon("color")
						.onClick(async () => {
							const selection = editor.getSelection();
							if(selection == null || selection.length == 0) return;
							const cStr: ControllableString = new ControllableString(selection);
							if(cStr.type == settings.labelName) {
								cStr.changePropertyValue("class", (text) => {
									if(text.length == 0) return settings.className[i];
									// Find first class name, change later.
									let e: number = 0, len: number = text.length;
									for(let s: number = 0; s < len; s++) {
										if(text.charAt(s) == " ") continue;
										else {
											e = s;
											do {
												e++;
											} while (e < len && text.charAt(e) != " ");
											while(e < len && text.charAt(e) == " ") {
												e++;
											}
											break;
										}
									}
									// Return changed string
									let value: string = e >= len ? settings.className[i] : settings.className[i] + " ";
									return value + text.substring(e, text.length);
								});
								editor.replaceSelection(cStr.getText());
							} else {
								let content: string = cStr.getChangeText((text) => {
									if(text.length > 0) {
										return "<" + settings.labelName + ' class="' + settings.className[i] + '">' + text + "</" + settings.labelName + ">";
									}
									return text;
								});
								editor.replaceSelection(content);
							}
						});
					})
				}
			});
		  })
		);
		
		// This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		//	new Notice('Make new plugin!');
		// });
		
		// Perform additional things with the ribbon
		// ribbonIconEl.addClass('font-color-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new FontColorModal(this.app).open();
		// 	}
		// });
		
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		//  	id: 'open-sample-modal-complex',
		//  	name: 'Open sample modal (complex)',
		//  	checkCallback: (checking: boolean) => {
				// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new FontColorModal(this.app).open();
		// 			}

					// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		
		this.addSettingTab(new FontColorSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		//  	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		settings = null;
	}

	async loadSettings() {
		//_plugin = this;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


/*class FontColorModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}*/

class FontColorSettingTab extends PluginSettingTab {
	plugin: FontColorPlugin;

	constructor(app: App, plugin: FontColorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		
		const fCS: FontColorSettings = this.plugin.settings;

		new Setting(containerEl)
			.setName('Label Name')
			.setDesc('custom label name')
			.addText(text => text
				.setPlaceholder('Max length of 10')
				.setValue(fCS.labelName)
				.onChange(async (value) => {
					fCS.labelName = value.trim().substring(0, 10);
					await this.plugin.saveSettings();
				}));
		
		for(let i = 0; i < fCS.className.length; i++) {
			new Setting(containerEl)
			.setName('class_name_' + (i+1))
			.setDesc('custom class name')
			.addText(text => text
				.setPlaceholder('Max length of 10')
				.setValue(fCS.className[i])
				.onChange(async (value) => {
					fCS.className[i] = value.trim().substring(0, 10);
					await this.plugin.saveSettings();
				}));
		}
		
	}
}
