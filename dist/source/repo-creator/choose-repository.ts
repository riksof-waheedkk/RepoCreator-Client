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
import 'font-awesome';

class Repository {
	constructor(
		public owner: string,
		public name: string,
		public favorite: boolean,
		public sponsored: boolean,
		public popular: boolean,
		public result: boolean
	) {}

	equals = (other: Repository): boolean => {
		return this.owner == other.owner
			&& this.name == other.name;
	}

	merge = (other: Repository) => {
		this.favorite = this.favorite || other.favorite;
		this.sponsored = this.sponsored || other.sponsored;
		this.popular = this.popular || other.popular;
		this.result = this.result || other.result;
	}

	get favoriteStyle(): string {
		return `color: ${this.favorite ? 'yellow' : 'white'}`;
	}

	get sponsoredStyle(): string {
		return `color: ${this.sponsored ? 'lime' : 'white'}`;
	}
}

enum Sections {
	SPONSORED,
	FAVORITES,
	POPULAR,
	SEARCH,
}

@autoinject
export class ChooseRepository {
	private allTemplates: Repository[] = [];
	private favoriteTemplates: Repository[] = [];
	private sponsoredTemplates: Repository[] = [];
	private popularTemplates: Repository[] = [];
	private resultTemplates: Repository[] = [];

	protected selectedSection: Sections = Sections.SPONSORED;

	protected searchInput: string;

	constructor(
		private oAuth: OAuth,
		private stripeCheckout: StripeCheckout,
		private repoCreator: RepoCreator,
		private gitHub: GitHub,
		private router: Router,
		private eventAggregator: EventAggregator,
		protected validation: Validation
	) {
		this.validation = validation.on(this)
			.ensure('searchInput')
			.isNotEmpty();
	}

	activate() {
		this.fetchSponsored();
		this.fetchPopular();
		if (this.oAuth.isLoggedOrLoggingIn)
			this.fetchFavorites();
	}

	get loggedIn(): boolean {
		return this.oAuth.isLoggedOrLoggingIn;
	}

	@computedFrom('searchInput')
	protected get inputValidated(): boolean {
		return !!this.searchInput;
	}

	@computedFrom('selectedSection')
	protected get isSponsoredSelected(): boolean {
		return this.selectedSection == Sections.SPONSORED;
	}

	@computedFrom('selectedSection')
	protected get isFavoritesSelected(): boolean {
		return this.selectedSection == Sections.FAVORITES;
	}

	@computedFrom('selectedSection')
	protected get isPopularSelected(): boolean {
		return this.selectedSection == Sections.POPULAR;
	}

	@computedFrom('selectedSection')
	protected get isSearchSelected(): boolean {
		return this.selectedSection == Sections.SEARCH;
	}

	protected showSponsored = () => {
		this.selectedSection = Sections.SPONSORED;
	}

	protected showFavorites = () => {
		this.selectedSection = Sections.FAVORITES;
	}

	protected showPopular = () => {
		this.selectedSection = Sections.POPULAR;
	}

	protected showSearch = () => {
		this.selectedSection = Sections.SEARCH;
	}

	protected search = () => {
		this.validation.validate().then(() => {
			this.clearSearchResults();
			this.gitHub.search(this.searchInput).then(searchResults => {
				let resultTemplates = underscore(searchResults).map(searchResult => new Repository(searchResult.owner.login, searchResult.name, false, false, false, true));
				this.mergeTemplates(resultTemplates);
			}).catch((error: Error) => {
				this.eventAggregator.publish(error);
			}).then(x => {
				this.searching = false;
			});
			this.searching = true;
		}).catch((validationResult: any) => {
		});
	}

	protected repoSelected = (repo: Repository) => {
		this.router.navigate(`name/${repo.owner}/${repo.name}`);
	}

	protected toggleFavorite = (repo: Repository): void => {
		if (repo.favorite)
			this.removeFavorite(repo);
		else
			this.addFavorite(repo);
	}

	protected sponsor = (repo: Repository) => {
		if (repo.sponsored)
			return;

		this.repoCreator.sponsor(new RepositoryWireModel("GitHub", repo.owner, repo.name)).then((wireModels: RepositoryWireModel[]) => {
			let repos = underscore(wireModels).map((wireModel: RepositoryWireModel) => new Repository(wireModel.owner, wireModel.name, false, true, false, false))
			this.clearSponsored();
			this.mergeTemplates(repos);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private removeFavorite = (repo: Repository): void => {
		let wireModel = new RepositoryWireModel("GitHub", repo.owner, repo.name);
		this.repoCreator.removeFavorite(wireModel).then(favorites => {
			let favoriteTemplates = underscore(favorites).map(favorite => new Repository(favorite.owner, favorite.name, true, false, false, false));
			this.clearFavorites();
			this.mergeTemplates(favoriteTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private addFavorite = (repo: Repository): void => {
		let wireModel = new RepositoryWireModel("GitHub", repo.owner, repo.name);
		this.repoCreator.addFavorite(wireModel).then(favorites => {
			let favoriteTemplates = underscore(favorites).map(favorite => new Repository(favorite.owner, favorite.name, true, false, false, false));
			this.clearFavorites();
			this.mergeTemplates(favoriteTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	// ----

	private clearPopular = () => {
		this.allTemplates = underscore(this.allTemplates)
			.each(template => template.popular = false)
			.filter(template => template.result || template.favorite || template.sponsored || template.popular);
	}

	private clearSponsored = () => {
		this.allTemplates = underscore(this.allTemplates)
			.each(template => template.sponsored = false)
			.filter(template => template.result || template.favorite || template.sponsored || template.popular);
	}

	private clearFavorites = () => {
		this.allTemplates = underscore(this.allTemplates)
			.each(template => template.favorite = false)
			.filter(template => template.result || template.favorite || template.sponsored || template.popular);
	}

	private clearSearchResults = () => {
		this.allTemplates = underscore(this.allTemplates)
			.each(template => template.result = false)
			.filter(template => template.result || template.favorite || template.sponsored || template.popular);
	}

	// ----

	protected fetchFavorites = (): void => {
		this.repoCreator.getFavorites().then(favorites => {
			let favoriteTemplates = underscore(favorites).map(favorite => new Repository(favorite.owner, favorite.name, true, false, false, false));
			this.mergeTemplates(favoriteTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private fetchSponsored = (): void => {
		this.repoCreator.getSponsored().then((repos: RepositoryWireModel[]) => {
			let sponsoredTemplates = underscore(repos).map((repo: RepositoryWireModel) => new Repository(repo.owner, repo.name, false, true, false, false));
			this.mergeTemplates(sponsoredTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private fetchPopular = (): void => {
		this.repoCreator.getPopular().then((repos: RepositoryWireModel[]) => {
			let popularTemplates = underscore(repos).map((repo: RepositoryWireModel) => new Repository(repo.owner, repo.name, false, false, true, false));
			this.mergeTemplates(popularTemplates);

		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	// ----

	private mergeTemplates = (repos: Repository[]) => {
		repos.forEach(repo => {
			let match: Repository = underscore(this.allTemplates).findWhere({ owner: repo.owner, name: repo.name });
			if (match)
				match.merge(repo);
			else
				this.allTemplates.push(repo);
		})
		this.updateTemplates();
	}

	private updateTemplates = () => {
		// setImmediate to avoid a jquery/Aurelia bug resulting in a console error message
		setImmediate(() => {
			this.favoriteTemplates = underscore(this.allTemplates).filter((repo: Repository) => repo.favorite);
			this.sponsoredTemplates = underscore(this.allTemplates).filter((repo: Repository) => repo.sponsored);
			this.popularTemplates = underscore(this.allTemplates).filter((repo: Repository) => repo.popular);
			this.resultTemplates = underscore(this.allTemplates).filter((repo: Repository) => repo.result);
		});
	}
}
