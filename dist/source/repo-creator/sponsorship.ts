import { RepoCreator } from 'source/services/RepoCreator';
import { Repository } from 'source/models/Repository';
import { SponsoredRepository } from 'source/models/SponsoredRepository';
import { OAuth } from 'source/services/OAuth-Auth0';
import { Router } from 'aurelia-router';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-dependency-injection';
import underscore from 'underscore';

@autoinject
export class Sponsorship {
	private repositories: Repository[] = [];

	constructor(
		private oAuth: OAuth,
		private repoCreator: RepoCreator,
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
		this.repoCreator.cancelSponsorship(repo).then(() => {
			this.fetchRepositories();
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private fetchRepositories = (): void => {
		this.repoCreator.getMyRepositories().then((repos: SponsoredRepository[]) => {
			this.repositories = underscore(repos).map(repo => repo.repository);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}
}
