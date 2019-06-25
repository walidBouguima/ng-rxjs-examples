import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';

import { LayoutConfig } from '../layout-selection/layout-config.interface';
import { SortConfig } from '../sort-selection/sort-config.interface';
import { ItemViewState } from './item-view-state.interface';
import { combineLatest, merge, of, ReplaySubject, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  mapTo,
  startWith,
  tap
} from 'rxjs/operators';
import * as d3 from 'd3';
import { isNotUndefined, selectDistinctState } from '@ng-rx/shared/core';
import { RxJsDataItem } from '@nx-v8/filter-sort-group/api-client';

@Component({
  selector: 'item-view',
  templateUrl: './item-view.component.html',
  styleUrls: ['./item-view.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemViewComponent {

  selectors = {
    itemView: 'item-view',
    item: 'item',
    sorted: 'sorted'
  };

  holder;

  transition = d3.transition().duration(650);

  stateSubject = new ReplaySubject<ItemViewState<RxJsDataItem>>(1);
  @Input()
  set state(state) {
    this.stateSubject.next(state);
  }

  layoutConfig$ = this.stateSubject
    .pipe(
      selectDistinctState('layoutConfig'),
      isNotUndefined<LayoutConfig>()
    );
  data$ = this.stateSubject.pipe(
    selectDistinctState('data'),
    isNotUndefined<RxJsDataItem[]>()
  );
  colorMap$ = this.stateSubject.pipe(
    selectDistinctState('colorMap'),
    isNotUndefined<{}>());

  layoutName$ = this.layoutConfig$
    .pipe(
      map(l => l.name()),
      isNotUndefined<string>(),
      startWith('default')
    );

  @Output() action = new Subject();

  primarySortKey$ = this.stateSubject.pipe(
    selectDistinctState<SortConfig>('sortConfig'),
    map(o => {
      const length = o ? Object.entries(o).length : 0;
      return length ? Object.entries(o).shift()[0] : '';
    }),
    distinctUntilChanged<string>()
  );

  //@TODO
  onNgAfterViewInitSideEffects$ = merge(
    //@TODO
    of(true).pipe(
      tap(v => this.holder = d3.select('.' + this.selectors.itemView))
    ),
    this.data$
      .pipe(
        tap(data => this.renderElements(data))
      ),
    combineLatest(this.layoutConfig$, this.data$)
      .pipe(
        tap(([layout, data]) => {
            this.drawLayout(layout, data);
            this.drawContainer(layout, data);
          }
        )
      ),
    combineLatest(this.primarySortKey$, this.data$, this.colorMap$)
      .pipe(
        tap(([key, data, colorMap]) => this.drawSortColor(key, data, colorMap))
      )
  )
    // dirty hack in view
    .pipe(mapTo(''));


  constructor() {

  }

  renderElements(data): void {
    const visibleProps = ['name', 'isOperator', 'isDeprecated', 'cedric', 'oldSchool', 'michael'];

    const enter = this.holder
      .selectAll('.' + this.selectors.item)
      .data(data, d => d.id)
      .enter()
      .append('div')
      .attr('class', d => this.selectors.item + visibleProps.reduce((a, i) => a + `${i}-${d[i]} `, ' '));

    visibleProps.forEach(p => enter
      .insert('div')
      .attr('class', p)
      .html(d => d[p])
    );
    /*
    enter.insert('img')
       .attr('src', d => `https://raw.githubusercontent.com/BioPhoton/Rx-Marble-Design-System/dev/assets/operators/new/${d.name}.png`);
    */
    const exit = this.holder
      .selectAll('.' + this.selectors.item)
      .data(data, d => d.id)
      .exit()
      .transition(this.transition)
      .style('height', 0 + 'px')
      .style('width', 0 + 'px')
      .remove();
  }

  drawLayout(layout: LayoutConfig, data: RxJsDataItem[]): void {
    return this.holder
      .selectAll('.' + this.selectors.item)
      .data(data, d => d.id)
      .transition(this.transition)
      .style('left', layout.left)
      .style('top', layout.top)
      .style('height', layout.height)
      .style('width', layout.width);

  }

  drawContainer(layout: LayoutConfig, data: RxJsDataItem[]): void {

    this.holder.transition(this.transition)
      .style('height', layout.totalHeight(data));
  }

  drawSortColor(key: string, data: RxJsDataItem[], colorMap: {}): void {
    this.holder.classed(this.selectors.sorted, !!key);

    this.holder.selectAll('.' + this.selectors.item)
      .data(data, d => d.id)
      .style('border-color', d => key ? colorMap[key][d[key]] : 'inherit');
  }

}
