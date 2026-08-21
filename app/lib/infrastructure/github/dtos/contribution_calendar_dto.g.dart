// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'contribution_calendar_dto.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ContributionCalendarDto _$ContributionCalendarDtoFromJson(
  Map<String, dynamic> json,
) => ContributionCalendarDto(
  totalContributions: (json['totalContributions'] as num?)?.toInt(),
  weeks: (json['weeks'] as List<dynamic>)
      .map((e) => ContributionWeekDto.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$ContributionCalendarDtoToJson(
  ContributionCalendarDto instance,
) => <String, dynamic>{
  'totalContributions': instance.totalContributions,
  'weeks': instance.weeks,
};

ContributionWeekDto _$ContributionWeekDtoFromJson(Map<String, dynamic> json) =>
    ContributionWeekDto(
      contributionDays: (json['contributionDays'] as List<dynamic>)
          .map((e) => ContributionDayDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$ContributionWeekDtoToJson(
  ContributionWeekDto instance,
) => <String, dynamic>{'contributionDays': instance.contributionDays};

ContributionDayDto _$ContributionDayDtoFromJson(Map<String, dynamic> json) =>
    ContributionDayDto(
      date: json['date'] as String,
      contributionCount: (json['contributionCount'] as num?)?.toInt(),
      level: (json['level'] as num?)?.toInt(),
    );

Map<String, dynamic> _$ContributionDayDtoToJson(ContributionDayDto instance) =>
    <String, dynamic>{
      'date': instance.date,
      'contributionCount': instance.contributionCount,
      'level': instance.level,
    };
