// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'contribution_calendar_dto.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ContributionCalendarDto _$ContributionCalendarDtoFromJson(
        Map<String, dynamic> json) =>
    ContributionCalendarDto(
      totalContributions: (json['totalContributions'] as num).toInt(),
      weeks: (json['weeks'] as List<dynamic>)
          .map((e) => ContributionWeekDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

ContributionWeekDto _$ContributionWeekDtoFromJson(Map<String, dynamic> json) =>
    ContributionWeekDto(
      contributionDays: (json['contributionDays'] as List<dynamic>)
          .map((e) => ContributionDayDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

ContributionDayDto _$ContributionDayDtoFromJson(Map<String, dynamic> json) =>
    ContributionDayDto(
      date: json['date'] as String,
      contributionCount: (json['contributionCount'] as num).toInt(),
      color: json['color'] as String,
    );
