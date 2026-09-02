import type { FilePick, FileSave } from './capabilities.ts'

export function createBrowserFileSave(document: Document): FileSave {
	return {
		async save(input) {
			const link = document.createElement('a')
			link.href = input.dataUrl
			link.download = input.filename
			link.hidden = true
			document.body.append(link)
			link.click()
			link.remove()
			return 'saved'
		},
	}
}

export function createBrowserFilePick(document: Document): FilePick {
	return {
		pick(input) {
			return new Promise((resolve, reject) => {
				const picker = document.createElement('input')
				picker.type = 'file'
				picker.accept = input.accept.join(',')
				picker.hidden = true
				const finish = () => picker.remove()
				picker.addEventListener(
					'cancel',
					() => {
						finish()
						resolve(null)
					},
					{ once: true },
				)
				picker.addEventListener(
					'change',
					() => {
						const file = picker.files?.item(0)
						if (!file) {
							finish()
							resolve(null)
							return
						}
						void file.text().then(
							(text) => {
								finish()
								resolve({ filename: file.name, text })
							},
							(error: unknown) => {
								finish()
								reject(error)
							},
						)
					},
					{ once: true },
				)
				document.body.append(picker)
				picker.click()
			})
		},
	}
}
