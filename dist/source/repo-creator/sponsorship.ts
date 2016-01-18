import { RepoCreator } from 'source/services/RepoCreator';
import { Repository as RepositoryWireModel } from 'source/models/Repository';
import { OAuth } from 'source/services/OAuth-Auth0';
import { GitHub } from 'source/services/GitHub';
import { StripeCheckout, StripeToken } from 'source/services/StripeCheckout';
import { Router } from 'aurelia-router';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-dependency-injection';
import { computedFrom } from 'aurelia-binding';
import { Validation } from 'aurelia-validation';
import underscore from 'underscore';

class Repository {
	constructor(
		public owner: string,
		public name: string
	) {}
}

@autoinject
export class Sponsorship {
	private repositories: Repository[] = [];

	constructor(
		private oAuth: OAuth,
		private stripeCheckout: StripeCheckout,
		private repoCreator: RepoCreator,
		private gitHub: GitHub,
		private router: Router,
		private eventAggregator: EventAggregator
	) {}

	activate() {
		if (this.oAuth.isLoggedOrLoggingIn)
			this.fetchRepositories();
	}

	get loggedIn(): boolean {
		return this.oAuth.isLoggedOrLoggingIn;
	}

	protected repoSelected = (repo: Repository) => {
		this.router.navigate(`name/${repo.owner}/${repo.name}`);
	}


	private cancelSponsorship = (repo: Repository): void => {
		let wireModel = new RepositoryWireModel("GitHub", repo.owner, repo.name);
		this.repoCreator.cancelSponsorship(wireModel).then(() => {
	    	this.fetchRepositories();
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private fetchRepositories = (): void => {

		this.repoCreator.getMyRepositories().then((repos: RepositoryWireModel[]) => {
			this.repositories = underscore(repos).map((repo: RepositoryWireModel) => new Repository(repo.repository.owner, repo.repository.name, true));
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}
}