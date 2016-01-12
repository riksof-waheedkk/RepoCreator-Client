import { Router, RouterConfiguration } from 'aurelia-router';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-dependency-injection';

@autoinject
export class RepoCreator {
	router: Router = null;

	routes = [
		{ route: ['', 'choose'], moduleId: './choose-repository', nav: false, title: 'Choose a Template' },
		{ route: 'name/:owner/:name', moduleId: './choose-name', nav: false, title: 'Choose a Name' },
		{ route: 'replacements/:templateOwner/:templateName/:destinationName', moduleId: './enter-replacements', nav: false, title: 'Replacements' }
	];

	public constructor(private eventAggregator: EventAggregator) {
		this.eventAggregator.subscribe(Error, (error: Error) => Rollbar.error(error));
	}

	configureRouter(config: RouterConfiguration, router: Router) {
		this.router = router;
		this.router.configure((config: any) => config.map(this.routes));
	}
}
