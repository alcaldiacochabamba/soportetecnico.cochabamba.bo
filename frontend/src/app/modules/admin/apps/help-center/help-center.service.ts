import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { FaqCategory, Guide, GuideCategory } from 'app/modules/admin/apps/help-center/help-center.type';
import { Observable, ReplaySubject, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HelpCenterService {
    private _faqs: ReplaySubject<FaqCategory[]> = new ReplaySubject<FaqCategory[]>(1);
    private _guides: ReplaySubject<GuideCategory[]> = new ReplaySubject<GuideCategory[]>(1);
    private _guide: ReplaySubject<GuideCategory> = new ReplaySubject<GuideCategory>(1);

    constructor(private _httpClient: HttpClient) {}

    get faqs$(): Observable<FaqCategory[]> {
        return this._faqs.asObservable();
    }

    get guides$(): Observable<GuideCategory[]> {
        return this._guides.asObservable();
    }

    get guide$(): Observable<GuideCategory> {
        return this._guide.asObservable();
    }

    getAllFaqs(): Observable<FaqCategory[]> {
        return this._httpClient.get<FaqCategory[]>('api/apps/help-center/faqs').pipe(
            tap((response: any) => {
                this._faqs.next(response);
            }),
        );
    }

    getFaqsByCategory(slug: string): Observable<FaqCategory[]> {
        return this._httpClient.get<FaqCategory[]>('api/apps/help-center/faqs', {
            params: { slug },
        }).pipe(
            tap((response: any) => {
                this._faqs.next(response);
            }),
        );
    }

    getAllGuides(limit = '4'): Observable<GuideCategory[]> {
        return this._httpClient.get<GuideCategory[]>('api/apps/help-center/guides', {
            params: { limit },
        }).pipe(
            tap((response: any) => {
                this._guides.next(response);
            }),
        );
    }

    getGuidesByCategory(slug: string): Observable<GuideCategory[]> {
        return this._httpClient.get<GuideCategory[]>('api/apps/help-center/guides', {
            params: { slug },
        }).pipe(
            tap((response: any) => {
                this._guides.next(response);
            }),
        );
    }

    /**
     * Get guide by category and guide slug
     *
     * @param categorySlug
     * @param guideSlug
     */
    getGuide(categorySlug: string, guideSlug: string): Observable<GuideCategory> {
        return this._httpClient.get<GuideCategory>('api/apps/help-center/guide', {
            params: {
                categorySlug,
                guideSlug,
            },
        }).pipe(
            tap((response: any) => {
                this._guide.next(response);
            }),
        );
    }
}

@Injectable({
    providedIn: 'root',
})
export class GuideResolver implements Resolve<any> {
    constructor(private _helpCenterService: HelpCenterService) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {
        return this._helpCenterService.getGuide(route.parent.paramMap.get('categorySlug'), route.paramMap.get('guideSlug'));
    }
}