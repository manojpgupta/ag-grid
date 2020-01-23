import React from 'react';
import './App.css';
import { getTemplates } from './templates.jsx';
import { Chart } from './Chart.jsx';
import { Options } from './Options.jsx';
import { Code } from './Code.jsx';
import { ChartTypeSelector } from './ChartTypeSelector.jsx';
import { deepClone } from './utils.jsx';

const appName = 'chart-api';

const createOptionsJson = (chartType, options) => {
    const shouldProvideAxisConfig = (options.axes && Object.keys(options.axes).length > 0) || chartType === 'scatter';

    const json = {
        ...options,
        axes: shouldProvideAxisConfig ? [{
            type: chartType === 'scatter' ? 'number' : 'category',
            position: 'bottom',
        },
        {
            type: 'number',
            position: 'left',
            ...options.axes,
        }] : undefined,
    };

    const gridStyle = json.axes && json.axes[1].gridStyle;

    if (gridStyle) {
        // special handling for gridStyle which requires an array
        json.axes[1].gridStyle = [gridStyle];
    }

    switch (chartType) {
        case 'bar':
            json.series = [{
                type: 'column',
                xKey: 'month',
                yKeys: ['revenue', 'profit'],
                ...options.series,
            }];
            break;
        case 'line':
            json.series = [{
                type: 'line',
                xKey: 'month',
                yKey: 'revenue',
                ...options.series,
            },
            {
                type: 'line',
                xKey: 'month',
                yKey: 'profit',
            }];
            break;
        case 'area':
            json.series = [{
                type: 'area',
                xKey: 'month',
                yKeys: ['revenue', 'profit'],
                ...options.series,
            }];
            break;
        case 'scatter':
            json.series = [{
                type: 'scatter',
                xKey: 'revenue',
                yKey: 'profit',
                ...options.series,
            }];
            break;
        case 'pie':
            json.series = [{
                type: 'pie',
                angleKey: 'revenue',
                labelKey: 'month',
                ...options.series,
            }];
            break;
    }

    return json;
};

export class App extends React.Component {
    state = {
        framework: this.getCurrentFramework(),
        chartType: 'bar',
        options: {},
        defaults: {},
    };

    getKeys = expression => expression.split('.');

    getDefaultValue = expression => {
        let { defaults } = this.state;
        const keys = this.getKeys(expression);

        while (keys.length > 0 && defaults != null) {
            defaults = defaults[keys.shift()];
        }

        return defaults;
    };

    updateOptionDefault = (expression, defaultValue) => {
        const keys = this.getKeys(expression);

        this.setState(prevState => {
            const newDefaults = { ...prevState.defaults };
            let objectToUpdate = newDefaults;

            while (keys.length > 1) {
                const key = keys.shift();
                const parent = objectToUpdate;

                objectToUpdate = { ...parent[key] };
                parent[key] = objectToUpdate;
            }

            objectToUpdate[keys.shift()] = defaultValue;

            return { defaults: newDefaults };
        });
    };

    // to ensure the chart always displays using the latest values, we first have to update the state
    // with the latest values to trigger the chart update, and then remove any no-longer needed keys
    // (ones where the value is the just the same as the default) so they aren't used in generated code
    updateOption = (expression, value, requiresWholeObject = false) => {
        const keys = this.getKeys(expression);
        const parentKeys = [...keys];
        parentKeys.pop();
        const defaultParent = { ...this.getDefaultValue(parentKeys.join('.')) || this.state.defaults };
        const defaultValue = defaultParent[keys[keys.length - 1]];
        const removeUnneededKeys = false;

        const removeUnneededKey = () => {
            if (!removeUnneededKeys || (value !== defaultValue && JSON.stringify(value) !== JSON.stringify(defaultValue))) {
                // key has a different value to the default, so don't remove it
                return;
            }

            const objects = [];
            const newOptions = deepClone(this.state.options);
            let objectToUpdate = newOptions;
            let keyIndex = keys.length - 1;

            for (let i = 0; i < keyIndex; i++) {
                objects.push(objectToUpdate);
                objectToUpdate = objectToUpdate[keys[i]];
            }

            let key = keys[keyIndex];

            if (requiresWholeObject) {
                if (JSON.stringify(objectToUpdate) === JSON.stringify(defaultParent)) {
                    // if all the defaults match, we can remove the whole object
                    objectToUpdate = {};
                }
            } else {
                delete objectToUpdate[key];
            }

            while (keyIndex > 0 && Object.keys(objectToUpdate).length < 1) {
                keyIndex--;
                objectToUpdate = objects[keyIndex];
                key = keys[keyIndex];

                delete objectToUpdate[key];
            }

            this.setState({ options: newOptions });
        };

        this.setState(prevState => {
            const newOptions = { ...prevState.options };
            let objectToUpdate = newOptions;
            const lastKeyIndex = keys.length - 1;

            for (let i = 0; i < lastKeyIndex; i++) {
                const key = keys[i];
                const parent = objectToUpdate;

                if (parent[key] == null) {
                    objectToUpdate = requiresWholeObject && i === lastKeyIndex - 1 ? defaultParent : {};
                } else {
                    objectToUpdate = { ...parent[key] };
                }

                parent[key] = objectToUpdate;
            }

            objectToUpdate[keys[lastKeyIndex]] = value;

            return { options: newOptions };
        }, removeUnneededKey);
    };

    changeChartType = type => {
        this.setState({ chartType: type, defaults: {}, options: {} });
    };

    getCurrentFramework() {
        const frameworkDropdownElement = window.parent.document.querySelector(`[data-framework-dropdown=${appName}]`);
        const currentFramework = frameworkDropdownElement && frameworkDropdownElement.getAttribute('data-current-framework');
        return currentFramework || 'vanilla';
    };

    componentDidMount() {
        this.componentDidUpdate();

        window.parent.document.querySelectorAll(`[data-framework-item=${appName}]`).forEach(element => {
            element.addEventListener('click', () => this.setState({ framework: this.getCurrentFramework() }));
        });
    }

    componentDidUpdate() {
        window.parent.document.getElementById(appName).setAttribute('data-context',
            JSON.stringify({
                files: getTemplates(this.state.framework, createOptionsJson(this.state.chartType, this.state.options))
            })
        );
    }

    render() {
        const options = createOptionsJson(this.state.chartType, this.state.options);

        return <div className="container">
            <ChartTypeSelector type={this.state.chartType} onChange={value => this.changeChartType(value)} />
            <div className="container__chart"><Chart options={options} /></div>
            <div className="container__bottom">
                <div className="container__options">
                    <Options
                        chartType={this.state.chartType}
                        updateOptionDefault={this.updateOptionDefault}
                        updateOption={this.updateOption} />
                </div>
                <div className="container__code"><Code framework={this.state.framework} options={options} /></div>
            </div>
        </div>;
    }
}

export default App;
