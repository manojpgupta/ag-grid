"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var chart_1 = require("./chart");
var array_1 = require("../util/array");
var group_1 = require("../scene/group");
var categoryAxis_1 = require("./axis/categoryAxis");
var groupedCategoryAxis_1 = require("./axis/groupedCategoryAxis");
var chartAxis_1 = require("./chartAxis");
var bbox_1 = require("../scene/bbox");
// import { ClipRect } from "../scene/clipRect";
var CartesianChart = /** @class */ (function (_super) {
    __extends(CartesianChart, _super);
    function CartesianChart(document) {
        if (document === void 0) { document = window.document; }
        var _this = _super.call(this, document) || this;
        _this._seriesRoot = new group_1.Group();
        // Prevent the scene from rendering chart components in an invalid state
        // (before first layout is performed).
        _this.scene.root.visible = false;
        var root = _this.scene.root;
        root.append(_this._seriesRoot);
        root.append(_this.legend.group);
        return _this;
    }
    Object.defineProperty(CartesianChart.prototype, "seriesRoot", {
        get: function () {
            return this._seriesRoot;
        },
        enumerable: true,
        configurable: true
    });
    CartesianChart.prototype.performLayout = function () {
        if (this.dataPending) {
            return;
        }
        this.scene.root.visible = true;
        var _a = this, width = _a.width, height = _a.height, axes = _a.axes, legend = _a.legend;
        var shrinkRect = new bbox_1.BBox(0, 0, width, height);
        this.positionCaptions();
        this.positionLegend();
        if (legend.enabled && legend.data.length) {
            var legendAutoPadding = this.legendAutoPadding;
            var legendPadding = this.legend.spacing;
            shrinkRect.x += legendAutoPadding.left;
            shrinkRect.y += legendAutoPadding.top;
            shrinkRect.width -= legendAutoPadding.left + legendAutoPadding.right;
            shrinkRect.height -= legendAutoPadding.top + legendAutoPadding.bottom;
            switch (this.legend.position) {
                case 'right':
                    shrinkRect.width -= legendPadding;
                    break;
                case 'bottom':
                    shrinkRect.height -= legendPadding;
                    break;
                case 'left':
                    shrinkRect.x += legendPadding;
                    shrinkRect.width -= legendPadding;
                    break;
                case 'top':
                    shrinkRect.y += legendPadding;
                    shrinkRect.height -= legendPadding;
                    break;
            }
        }
        var _b = this, captionAutoPadding = _b.captionAutoPadding, padding = _b.padding;
        this.updateAxes();
        shrinkRect.x += padding.left;
        shrinkRect.width -= padding.left + padding.right;
        shrinkRect.y += padding.top + captionAutoPadding;
        shrinkRect.height -= padding.top + captionAutoPadding + padding.bottom;
        axes.forEach(function (axis) {
            axis.group.visible = true;
            var axisThickness = Math.floor(axis.computeBBox().width);
            switch (axis.position) {
                case chartAxis_1.ChartAxisPosition.Top:
                    shrinkRect.y += axisThickness;
                    shrinkRect.height -= axisThickness;
                    axis.translation.y = Math.floor(shrinkRect.y + 1);
                    axis.label.mirrored = true;
                    break;
                case chartAxis_1.ChartAxisPosition.Right:
                    shrinkRect.width -= axisThickness;
                    axis.translation.x = Math.floor(shrinkRect.x + shrinkRect.width);
                    axis.label.mirrored = true;
                    break;
                case chartAxis_1.ChartAxisPosition.Bottom:
                    shrinkRect.height -= axisThickness;
                    axis.translation.y = Math.floor(shrinkRect.y + shrinkRect.height + 1);
                    break;
                case chartAxis_1.ChartAxisPosition.Left:
                    shrinkRect.x += axisThickness;
                    shrinkRect.width -= axisThickness;
                    axis.translation.x = Math.floor(shrinkRect.x);
                    break;
            }
        });
        axes.forEach(function (axis) {
            switch (axis.position) {
                case chartAxis_1.ChartAxisPosition.Top:
                    axis.translation.x = Math.floor(shrinkRect.x);
                    axis.range = [0, shrinkRect.width];
                    axis.gridLength = shrinkRect.height;
                    break;
                case chartAxis_1.ChartAxisPosition.Right:
                    axis.translation.y = Math.floor(shrinkRect.y);
                    if (axis instanceof categoryAxis_1.CategoryAxis || axis instanceof groupedCategoryAxis_1.GroupedCategoryAxis) {
                        axis.range = [0, shrinkRect.height];
                    }
                    else {
                        axis.range = [shrinkRect.height, 0];
                    }
                    axis.gridLength = shrinkRect.width;
                    break;
                case chartAxis_1.ChartAxisPosition.Bottom:
                    axis.translation.x = Math.floor(shrinkRect.x);
                    axis.range = [0, shrinkRect.width];
                    axis.gridLength = shrinkRect.height;
                    break;
                case chartAxis_1.ChartAxisPosition.Left:
                    axis.translation.y = Math.floor(shrinkRect.y);
                    if (axis instanceof categoryAxis_1.CategoryAxis || axis instanceof groupedCategoryAxis_1.GroupedCategoryAxis) {
                        axis.range = [0, shrinkRect.height];
                    }
                    else {
                        axis.range = [shrinkRect.height, 0];
                    }
                    axis.gridLength = shrinkRect.width;
                    break;
            }
            // axis.tick.count = Math.abs(axis.range[1] - axis.range[0]) > 200 ? 10 : 5;
        });
        this.seriesRect = shrinkRect;
        this.series.forEach(function (series) {
            series.group.translationX = Math.floor(shrinkRect.x);
            series.group.translationY = Math.floor(shrinkRect.y);
            series.update(); // this has to happen after the `updateAxes` call
        });
        // When seriesRoot is a ClipRect:
        // const { seriesRoot } = this;
        // seriesRoot.x = shrinkRect.x;
        // seriesRoot.y = shrinkRect.y;
        // seriesRoot.width = shrinkRect.width;
        // seriesRoot.height = shrinkRect.height;
        this.axes.forEach(function (axis) { return axis.update(); });
    };
    CartesianChart.prototype.initSeries = function (series) {
        _super.prototype.initSeries.call(this, series);
        series.addEventListener('dataProcessed', this.updateAxes, this);
    };
    CartesianChart.prototype.freeSeries = function (series) {
        _super.prototype.freeSeries.call(this, series);
        series.removeEventListener('dataProcessed', this.updateAxes, this);
    };
    CartesianChart.prototype.updateAxes = function () {
        this.axes.forEach(function (axis) {
            var _a;
            var direction = axis.direction, boundSeries = axis.boundSeries;
            if (axis.linkedTo) {
                axis.domain = axis.linkedTo.domain;
            }
            else {
                var domains_1 = [];
                boundSeries.filter(function (s) { return s.visible; }).forEach(function (series) {
                    domains_1.push(series.getDomain(direction));
                });
                var domain = (_a = new Array()).concat.apply(_a, domains_1);
                axis.domain = array_1.numericExtent(domain) || domain; // if numeric extent can't be found, it's categories
            }
            axis.update();
        });
    };
    CartesianChart.className = 'CartesianChart';
    CartesianChart.type = 'cartesian';
    return CartesianChart;
}(chart_1.Chart));
exports.CartesianChart = CartesianChart;
//# sourceMappingURL=cartesianChart.js.map