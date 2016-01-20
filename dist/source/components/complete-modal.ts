import { customElement, useView } from 'aurelia-templating';
import { Router } from 'aurelia-router';
import jquery from 'jquery';
//import 'bootstrap';

@customElement('complete-modal')
@useView('./complete-modal.html')
export class CompleteModal {
	constructor(private router: Router) {}

	private newRepoLink: string;

	public show(newRepoLink: string) {
		if (!newRepoLink)
			throw new Error('A repoOwner is required to show the complete modal.');

		this.newRepoLink = newRepoLink;

		jquery('#complete-modal-id').modal('show');
	}

	protected openRepository() {
		if (!this.newRepoLink)
			throw new Error('A newRepoLink is required to open a repo.');

		jquery('#complete-modal-id').modal('hide');
		window.location.href = this.newRepoLink;
	}

	protected startOver() {
		jquery('#complete-modal-id').modal('hide');
		this.router.navigate("choose");
	}
}
