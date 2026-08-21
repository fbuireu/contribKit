import 'package:json_annotation/json_annotation.dart';

part 'contribution_calendar_dto.g.dart';

@JsonSerializable()
final class ContributionCalendarDto {
  const ContributionCalendarDto({this.totalContributions, required this.weeks});

  factory ContributionCalendarDto.fromJson(Map<String, dynamic> json) =>
      _$ContributionCalendarDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ContributionCalendarDtoToJson(this);

  final int? totalContributions;
  final List<ContributionWeekDto> weeks;
}

@JsonSerializable()
final class ContributionWeekDto {
  const ContributionWeekDto({required this.contributionDays});

  factory ContributionWeekDto.fromJson(Map<String, dynamic> json) =>
      _$ContributionWeekDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ContributionWeekDtoToJson(this);

  final List<ContributionDayDto> contributionDays;
}

@JsonSerializable()
final class ContributionDayDto {
  const ContributionDayDto({
    required this.date,
    this.contributionCount,
    this.level,
  });

  factory ContributionDayDto.fromJson(Map<String, dynamic> json) =>
      _$ContributionDayDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ContributionDayDtoToJson(this);

  final String date;
  final int? contributionCount;
  final int? level;
}
