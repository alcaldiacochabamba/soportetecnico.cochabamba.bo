import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Router, RouterLink } from '@angular/router';
import { faqs as allFaqsData, guides as allGuidesData, faqCategories, guideCategories as allGuideCategories } from 'app/mock-api/apps/help-center/data';
import { Faq, Guide, GuideCategory } from 'app/modules/admin/apps/help-center/help-center.type';
import { cloneDeep } from 'lodash-es';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
    selector: 'help-center',
    templateUrl: './help-center.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        RouterLink,
        MatExpansionModule,
        NgFor,
        NgIf,
        ReactiveFormsModule,
        MatAutocompleteModule
    ],
})
export class HelpCenterComponent implements OnInit, OnDestroy {
    faqs: Faq[] = allFaqsData;
    guides: Guide[] = allGuidesData;
    faqCategory: any = faqCategories[0];
    filteredResults: any[] = [];
    
    searchInputControl: FormControl = new FormControl('');
    private _unsubscribeAll: Subject<any> = new Subject();

    constructor(private _router: Router) {}

    ngOnInit(): void {
        this.searchInputControl.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(300),
                distinctUntilChanged()
            )
            .subscribe((query: string) => {
                this.filterResults(query);
            });
    }

    /**
     * Filtra las FAQs y guías.
     *
     * @param query
     */
    filterResults(query: string): void {
        const normalizedQuery = query.toLowerCase().trim();
        this.filteredResults = [];

        // Si la consulta está vacía, mostrar todas las guías y FAQs.
        if (!normalizedQuery) {
            // Filtrar y mapear FAQs
            const faqs = this.faqs.map(faq => ({ ...faq, type: 'faq', display: faq.question }));
            
            // Filtrar y mapear Guías
            const guides = this.guides.map(guide => ({
                ...guide,
                type: 'guide',
                display: guide.title,
                categorySlug: allGuideCategories.find(cat => cat.id === guide.categoryId)?.slug
            }));

            this.filteredResults = [...faqs, ...guides];
            return;
        }

        // Si hay una consulta, filtrar por pregunta, respuesta, título o subtítulo
        const faqs = this.faqs.filter(faq =>
            faq.question.toLowerCase().includes(normalizedQuery) ||
            faq.answer.toLowerCase().includes(normalizedQuery)
        ).map(faq => ({ ...faq, type: 'faq', display: faq.question }));

        const guides = this.guides.filter(guide =>
            guide.title.toLowerCase().includes(normalizedQuery) ||
            (guide.subtitle && guide.subtitle.toLowerCase().includes(normalizedQuery))
        ).map(guide => ({
            ...guide,
            type: 'guide',
            display: guide.title,
            categorySlug: allGuideCategories.find(cat => cat.id === guide.categoryId)?.slug
        }));

        this.filteredResults = [...faqs, ...guides];
    }

    /**
     * Redirige a la página correspondiente
     *
     * @param item
     */
    navigateToItem(item: any): void {
        if (item.type === 'faq') {
            this._router.navigate(['/apps/help-center/faqs'], { fragment: item.id });
        } else if (item.type === 'guide' && item.categorySlug) {
            this._router.navigate(['/apps/help-center/guides', item.categorySlug, item.slug]);
        }
    }

    /**
     * Se activa cuando el campo de búsqueda obtiene el foco.
     */
    onSearchInputFocus(): void {
        this.filterResults('');
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
    
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }
}