import { LightningElement, wire, track } from 'lwc';

import initMethod from '@salesforce/apex/DEMJContentManagement.initMethod';
import getUserWebinar from '@salesforce/apex/DEMJContentManagement.getUserWebinar';

export default class DemjCMSContent extends LightningElement {
  @track results;
  @track datas = [];
  @track loaded = false;

  @wire(initMethod)
  loadRecord({ error, data }) {
    if (error) console.error(error);
    if (data) {
      this.results = data;
      this.populateData();
    }
  }

  populateData = async () => {
    try {
      const userWebinars = await getUserWebinar();
      this.results.forEach(val => {
        const { source, title } = val.contentNodes;
        if (userWebinars && userWebinars.indexOf(val.title) > -1) {
          return;
        }
        this.datas.push({
          id: val.managedContentId,
          image: source.url,
          title: title.value,
          description: (val.contentNodes.altText) ? val.contentNodes.altText.value : '',
          url: (val.contentNodes.thumbUrl) ? val.contentNodes.thumbUrl.value : '#',
        });
      });
      this.datas.sort((prev, next) => {
        const nameA = prev.title;
        const nameB = next.title;
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      })
      this.loaded = true;
    } catch (e) {
      console.error(e)
    }
  }
}