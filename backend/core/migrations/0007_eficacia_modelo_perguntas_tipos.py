from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0006_eficacia_models"),
    ]

    operations = [
        migrations.AlterField(
            model_name="eficaciaquestionario",
            name="treinamento",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="questionario_eficacia",
                to="core.treinamento",
            ),
        ),
        migrations.AlterField(
            model_name="eficaciaquestionario",
            name="nota_minima",
            field=models.PositiveIntegerField(blank=True, default=70, null=True),
        ),
        migrations.AddField(
            model_name="eficaciapergunta",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("multipla_escolha_correta", "Multipla escolha com resposta certa"),
                    ("multipla_escolha_sem_correta", "Multipla escolha sem resposta certa"),
                    ("nota_1_10", "Nota de 1 a 10"),
                    ("aberta", "Pergunta aberta"),
                ],
                default="multipla_escolha_correta",
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="eficaciapergunta",
            name="obrigatoria",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="eficaciaresposta",
            name="nota",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="eficaciaresposta",
            name="texto_resposta",
            field=models.TextField(blank=True, null=True),
        ),
    ]
