import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Guide, GuideCategory } from 'app/modules/admin/apps/help-center/help-center.type';
import { Subject, takeUntil } from 'rxjs';
import { NgFor, NgIf } from '@angular/common';

@Component({
    selector: 'help-center-guides-guide',
    templateUrl: './guide.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [MatButtonModule, RouterLink, MatIconModule, NgFor, NgIf],
})
export class HelpCenterGuidesGuideComponent implements OnInit, OnDestroy {
    guideCategory: GuideCategory | null = null;
    private _unsubscribeAll: Subject<any> = new Subject();

    constructor(private _activatedRoute: ActivatedRoute) {}

    ngOnInit(): void {
        this._activatedRoute.data.pipe(takeUntil(this._unsubscribeAll)).subscribe(({ guide }) => {
            if (guide) {
                this.guideCategory = guide;
                if (this.guideCategory.guides && this.guideCategory.guides.length > 0) {
                    this.guideCategory.guides[0].content = this.addIdsToHeadings(this.guideCategory.guides[0].content);
                }
            } else {
                this.guideCategory = null;
            }
        });
    }

    addIdsToHeadings(htmlContent: string): string {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const headings = doc.querySelectorAll('h2, h3, h4, h5, h6');

        headings.forEach(heading => {
            const headingText = heading.textContent || '';
            const id = headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            heading.setAttribute('id', id);
        });
        
        return doc.body.innerHTML;
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }
}