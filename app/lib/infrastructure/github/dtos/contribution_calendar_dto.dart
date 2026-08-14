import 'package:json_annotation/json_annotation.dart';

part 'contribution_calendar_dto.g.dart';

@JsonSerializable(createToJson: false)
final class ContributionCalendarDto {
  const ContributionCalendarDto({
    required this.totalContributions,
    required this.weeks,
  });

  factory ContributionCalendarDto.fromJson(Map<String, dynamic> json) =>
      _$ContributionCalendarDtoFromJson(json);

  final int totalContributions;
  final List<ContributionWeekDto> weeks;
}

@JsonSerializable(createToJson: false)
final class ContributionWeekDto {
  const ContributionWeekDto({required this.contributionDays});

  factory ContributionWeekDto.fromJson(Map<String, dynamic> json) =>
      _$ContributionWeekDtoFromJson(json);

  final List<ContributionDayDto> contributionDays;
}

@JsonSerializable(createToJson: false)
final class ContributionDayDto {
  const ContributionDayDto({
    required this.date,
    required this.contributionCount,
    this.level,
  });

  factory ContributionDayDto.fromJson(Map<String, dynamic> json) =>
      _$ContributionDayDtoFromJson(json);

  final String date;
  final int contributionCount;
  final int? level;
}
