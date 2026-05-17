// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'viewer_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ViewerState {

 Username? get username; ContributionCalendar? get calendar; bool get fromCache; bool get isExporting; bool get isLoadingCalendar; Year? get year; bool get isLoadingSettings; Palette? get palette; CellShape get cellShape; Failure? get error;
/// Create a copy of ViewerState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ViewerStateCopyWith<ViewerState> get copyWith => _$ViewerStateCopyWithImpl<ViewerState>(this as ViewerState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ViewerState&&(identical(other.username, username) || other.username == username)&&(identical(other.calendar, calendar) || other.calendar == calendar)&&(identical(other.fromCache, fromCache) || other.fromCache == fromCache)&&(identical(other.isExporting, isExporting) || other.isExporting == isExporting)&&(identical(other.isLoadingCalendar, isLoadingCalendar) || other.isLoadingCalendar == isLoadingCalendar)&&(identical(other.year, year) || other.year == year)&&(identical(other.isLoadingSettings, isLoadingSettings) || other.isLoadingSettings == isLoadingSettings)&&(identical(other.palette, palette) || other.palette == palette)&&(identical(other.cellShape, cellShape) || other.cellShape == cellShape)&&(identical(other.error, error) || other.error == error));
}


@override
int get hashCode => Object.hash(runtimeType,username,calendar,fromCache,isExporting,isLoadingCalendar,year,isLoadingSettings,palette,cellShape,error);

@override
String toString() {
  return 'ViewerState(username: $username, calendar: $calendar, fromCache: $fromCache, isExporting: $isExporting, isLoadingCalendar: $isLoadingCalendar, year: $year, isLoadingSettings: $isLoadingSettings, palette: $palette, cellShape: $cellShape, error: $error)';
}


}

/// @nodoc
abstract mixin class $ViewerStateCopyWith<$Res>  {
  factory $ViewerStateCopyWith(ViewerState value, $Res Function(ViewerState) _then) = _$ViewerStateCopyWithImpl;
@useResult
$Res call({
 Username? username, ContributionCalendar? calendar, bool fromCache, bool isExporting, bool isLoadingCalendar, Year? year, bool isLoadingSettings, Palette? palette, CellShape cellShape, Failure? error
});




}
/// @nodoc
class _$ViewerStateCopyWithImpl<$Res>
    implements $ViewerStateCopyWith<$Res> {
  _$ViewerStateCopyWithImpl(this._self, this._then);

  final ViewerState _self;
  final $Res Function(ViewerState) _then;

/// Create a copy of ViewerState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? username = freezed,Object? calendar = freezed,Object? fromCache = null,Object? isExporting = null,Object? isLoadingCalendar = null,Object? year = freezed,Object? isLoadingSettings = null,Object? palette = freezed,Object? cellShape = null,Object? error = freezed,}) {
  return _then(_self.copyWith(
username: freezed == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as Username?,calendar: freezed == calendar ? _self.calendar : calendar // ignore: cast_nullable_to_non_nullable
as ContributionCalendar?,fromCache: null == fromCache ? _self.fromCache : fromCache // ignore: cast_nullable_to_non_nullable
as bool,isExporting: null == isExporting ? _self.isExporting : isExporting // ignore: cast_nullable_to_non_nullable
as bool,isLoadingCalendar: null == isLoadingCalendar ? _self.isLoadingCalendar : isLoadingCalendar // ignore: cast_nullable_to_non_nullable
as bool,year: freezed == year ? _self.year : year // ignore: cast_nullable_to_non_nullable
as Year?,isLoadingSettings: null == isLoadingSettings ? _self.isLoadingSettings : isLoadingSettings // ignore: cast_nullable_to_non_nullable
as bool,palette: freezed == palette ? _self.palette : palette // ignore: cast_nullable_to_non_nullable
as Palette?,cellShape: null == cellShape ? _self.cellShape : cellShape // ignore: cast_nullable_to_non_nullable
as CellShape,error: freezed == error ? _self.error : error // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [ViewerState].
extension ViewerStatePatterns on ViewerState {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ViewerState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ViewerState() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ViewerState value)  $default,){
final _that = this;
switch (_that) {
case _ViewerState():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ViewerState value)?  $default,){
final _that = this;
switch (_that) {
case _ViewerState() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( Username? username,  ContributionCalendar? calendar,  bool fromCache,  bool isExporting,  bool isLoadingCalendar,  Year? year,  bool isLoadingSettings,  Palette? palette,  CellShape cellShape,  Failure? error)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ViewerState() when $default != null:
return $default(_that.username,_that.calendar,_that.fromCache,_that.isExporting,_that.isLoadingCalendar,_that.year,_that.isLoadingSettings,_that.palette,_that.cellShape,_that.error);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( Username? username,  ContributionCalendar? calendar,  bool fromCache,  bool isExporting,  bool isLoadingCalendar,  Year? year,  bool isLoadingSettings,  Palette? palette,  CellShape cellShape,  Failure? error)  $default,) {final _that = this;
switch (_that) {
case _ViewerState():
return $default(_that.username,_that.calendar,_that.fromCache,_that.isExporting,_that.isLoadingCalendar,_that.year,_that.isLoadingSettings,_that.palette,_that.cellShape,_that.error);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( Username? username,  ContributionCalendar? calendar,  bool fromCache,  bool isExporting,  bool isLoadingCalendar,  Year? year,  bool isLoadingSettings,  Palette? palette,  CellShape cellShape,  Failure? error)?  $default,) {final _that = this;
switch (_that) {
case _ViewerState() when $default != null:
return $default(_that.username,_that.calendar,_that.fromCache,_that.isExporting,_that.isLoadingCalendar,_that.year,_that.isLoadingSettings,_that.palette,_that.cellShape,_that.error);case _:
  return null;

}
}

}

/// @nodoc


class _ViewerState extends ViewerState {
  const _ViewerState({this.username = null, this.calendar = null, this.fromCache = false, this.isExporting = false, this.isLoadingCalendar = false, this.year, this.isLoadingSettings = false, this.palette, this.cellShape = CellShape.rounded, this.error = null}): super._();
  

@override@JsonKey() final  Username? username;
@override@JsonKey() final  ContributionCalendar? calendar;
@override@JsonKey() final  bool fromCache;
@override@JsonKey() final  bool isExporting;
@override@JsonKey() final  bool isLoadingCalendar;
@override final  Year? year;
@override@JsonKey() final  bool isLoadingSettings;
@override final  Palette? palette;
@override@JsonKey() final  CellShape cellShape;
@override@JsonKey() final  Failure? error;

/// Create a copy of ViewerState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ViewerStateCopyWith<_ViewerState> get copyWith => __$ViewerStateCopyWithImpl<_ViewerState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ViewerState&&(identical(other.username, username) || other.username == username)&&(identical(other.calendar, calendar) || other.calendar == calendar)&&(identical(other.fromCache, fromCache) || other.fromCache == fromCache)&&(identical(other.isExporting, isExporting) || other.isExporting == isExporting)&&(identical(other.isLoadingCalendar, isLoadingCalendar) || other.isLoadingCalendar == isLoadingCalendar)&&(identical(other.year, year) || other.year == year)&&(identical(other.isLoadingSettings, isLoadingSettings) || other.isLoadingSettings == isLoadingSettings)&&(identical(other.palette, palette) || other.palette == palette)&&(identical(other.cellShape, cellShape) || other.cellShape == cellShape)&&(identical(other.error, error) || other.error == error));
}


@override
int get hashCode => Object.hash(runtimeType,username,calendar,fromCache,isExporting,isLoadingCalendar,year,isLoadingSettings,palette,cellShape,error);

@override
String toString() {
  return 'ViewerState(username: $username, calendar: $calendar, fromCache: $fromCache, isExporting: $isExporting, isLoadingCalendar: $isLoadingCalendar, year: $year, isLoadingSettings: $isLoadingSettings, palette: $palette, cellShape: $cellShape, error: $error)';
}


}

/// @nodoc
abstract mixin class _$ViewerStateCopyWith<$Res> implements $ViewerStateCopyWith<$Res> {
  factory _$ViewerStateCopyWith(_ViewerState value, $Res Function(_ViewerState) _then) = __$ViewerStateCopyWithImpl;
@override @useResult
$Res call({
 Username? username, ContributionCalendar? calendar, bool fromCache, bool isExporting, bool isLoadingCalendar, Year? year, bool isLoadingSettings, Palette? palette, CellShape cellShape, Failure? error
});




}
/// @nodoc
class __$ViewerStateCopyWithImpl<$Res>
    implements _$ViewerStateCopyWith<$Res> {
  __$ViewerStateCopyWithImpl(this._self, this._then);

  final _ViewerState _self;
  final $Res Function(_ViewerState) _then;

/// Create a copy of ViewerState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? username = freezed,Object? calendar = freezed,Object? fromCache = null,Object? isExporting = null,Object? isLoadingCalendar = null,Object? year = freezed,Object? isLoadingSettings = null,Object? palette = freezed,Object? cellShape = null,Object? error = freezed,}) {
  return _then(_ViewerState(
username: freezed == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as Username?,calendar: freezed == calendar ? _self.calendar : calendar // ignore: cast_nullable_to_non_nullable
as ContributionCalendar?,fromCache: null == fromCache ? _self.fromCache : fromCache // ignore: cast_nullable_to_non_nullable
as bool,isExporting: null == isExporting ? _self.isExporting : isExporting // ignore: cast_nullable_to_non_nullable
as bool,isLoadingCalendar: null == isLoadingCalendar ? _self.isLoadingCalendar : isLoadingCalendar // ignore: cast_nullable_to_non_nullable
as bool,year: freezed == year ? _self.year : year // ignore: cast_nullable_to_non_nullable
as Year?,isLoadingSettings: null == isLoadingSettings ? _self.isLoadingSettings : isLoadingSettings // ignore: cast_nullable_to_non_nullable
as bool,palette: freezed == palette ? _self.palette : palette // ignore: cast_nullable_to_non_nullable
as Palette?,cellShape: null == cellShape ? _self.cellShape : cellShape // ignore: cast_nullable_to_non_nullable
as CellShape,error: freezed == error ? _self.error : error // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
