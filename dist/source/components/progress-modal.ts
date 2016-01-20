import { customElement, useView, bindable } from 'aurelia-templating';
import jquery from 'jquery';
//import 'bootstrap';

@customElement('progress-modal')
@useView('./progress-modal.html')
export class ProgressModal {
	@bindable
	public title: string;
	@bindable
	public id: string;

	protected get modalId(): string {
		return `modal-${this.id}`;
	}

	protected bind(bindingContext: any) {
		if (!this.title)
			throw new Error("Must provide title to progress-modal!");
		if (!this.id)
			throw new Error("Must provide id to progress-modal!");
	}

	public show(promise: Promise<any>) {
		if (!promise)
			throw new Error('A promise is required to show the progress modal.');

		jquery(`#${this.modalId}`).modal('show');
		promise.then(_ => this.hide(), _ => this.hide());
	}

	public hide() {
		jquery(`#${this.modalId}`).modal('hide');
	}
}
